/**
 * NOTE: Many esri classes are available directly but there
 * are a few that have to be implicitly required to work for
 * some reason. Notably, any class at the root level seems
 * to require being implicitly required.
 */

/**
 * ArcGIS JS API v3.29 Class
 *
 * @param {*} config
 */
function ArcGIS_v3_29(config) {
  this.config = config;
  this.map = undefined;
  this.multipoint = undefined;
  this.points = {
    loading: 0
  };
  this.markers = {};
}

/**
 * Initialize the map.
 */
ArcGIS_v3_29.prototype.init = function() {
  var self = this;

  return new Promise(function(resolve, reject) {
    require([
      "esri/config",
      "esri/map",
      "esri/geometry/webMercatorUtils"
    ], function(Config, Map, webMercatorUtils) {
      self.Config = Config;
      self.webMercatorUtils = webMercatorUtils;

      // Create / Config new map instance.
      self.map = new Map(self.config.container, {
        basemap: "hybrid",
        zoom: 4,
        extent: new esri.geometry.Extent({
          xmin: -14177690,
          ymin: 2618510,
          xmax: -7084330,
          ymax: 6532090,
          spatialReference: {
            wkid: 102100
          }
        })
      });

      // Map load event handler.
      self.map.on("load", function(evt) {
        if (evt.target.loaded === true) {
          // Initialize the multipoint.
          self.multipoint = new esri.geometry.Multipoint(
            self.map.spatialReference
          );

          // Load all the layers.
          self.loadAllLayers();

          // Resolve the promise.
          resolve(self);
        } else {
          reject(evt);
        }
      });
    });
  });
};

/**
 * Add a single marker to the map.
 *
 * @param address
 */
ArcGIS_v3_29.prototype.addMarker = function(address) {
  return new Promise(
    function(resolve, reject) {
      this.points.loading++;
      this.addressToCoordinates(address)
        .then(
          function(coordinates) {
            this.points.loading--;
            var marker = this.createMarker(coordinates, address);
            // Add a new point to the map.
            this.map.graphics.add(marker);

            if (this.points.loading === 0) {
              // Reset the map extent.
              this.setExtent();
            }

            var markerID = "m" + (Math.random() * 1e32).toString(36);

            this.markers[markerID] = marker;

            // Resolve the promise.
            resolve(markerID);
          }.bind(this)
        )
        .catch(function(err) {
          reject(err);
        });
    }.bind(this)
  );
};

/**
 * Remove a single marker from the map.
 */
ArcGIS_v3_29.prototype.removeMarker = function(markerID) {
  var marker = this.markers[markerID];
  this.map.graphics.remove(marker);
  this.multipoint.removePoint(marker.geometry);
  delete this.points[markerID];
  this.setExtent();
};

/**
 * Create a single map marker. This simply creates the
 * marker.  It still needs added to both the map and the
 * multipoint set of points.
 *
 * @param coordinates
 * @param attributes
 */
ArcGIS_v3_29.prototype.createMarker = function(coordinates, address) {
  // Create a new point.
  var point = new esri.geometry.Point(coordinates);

  // Add the point to the point set.
  this.multipoint.addPoint(point);

  // Create a new marker symbol.
  var symbol = new esri.symbol.SimpleMarkerSymbol({
    color: [255, 0, 0, 255], // red
    size: 10,
    angle: -30,
    xoffset: 0,
    yoffset: 0,
    type: "esriSMS",
    outline: {
      color: [0, 0, 0, 255], // black
      width: 1,
      type: "esriSLS",
      style: "esriSLSSolid"
    }
  });

  var attributes = {
    address: address
  };

  var template = new esri.InfoTemplate({
    title: "${address}"
  });

  // Return the point graphic to display on map.
  return new esri.Graphic(point, symbol, attributes, template);
};

/**
 *
 * @param address
 */
ArcGIS_v3_29.prototype.suggest = function(address) {
  var map = this.map;
  return new Promise(function(resolve, reject) {
    require(["esri/tasks/locator"], function(Locator) {
      new Locator(
        "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer"
      )
        .suggestLocations({
          text: address,
          categories: [
            {
              name: "Address",
              categories: [
                { name: "Subaddress" },
                { name: "Point Address" },
                { name: "Street Address" }
              ]
            }
          ],
          location: map.extent.getCenter().normalize(),
          distance: 100,
          maxSuggestions: 5
        })
        .then(function(suggestions) {
          resolve(suggestions);
        })
        .catch(function(err) {
          reject(err);
        });
    });
  });
};

/**
 * Converts a longitude / latitude pair to an address.
 *
 * @param lon
 * @param lat
 */
ArcGIS_v3_29.prototype.coordinatesToAddress = function(lon, lat) {
  return new Promise(function(resolve, reject) {
    require(["esri/tasks/locator"], function(Locator) {
      new Locator(
        "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer"
      )
        .locationToAddress(
          new esri.geometry.Point({
            longitude: lon,
            latitude: lat
          }),
          100
        )
        .then(function(res) {
          console.log(res);
          resolve(res);
        })
        .catch(function(err) {
          reject(err);
        });
    });
  });
};

/**
 * Converts an address to a set of geocodes (longitude, latitude).
 *
 * @param address
 */
ArcGIS_v3_29.prototype.addressToCoordinates = function(address) {
  return new Promise(function(resolve, reject) {
    require(["esri/tasks/locator"], function(Locator) {
      new Locator(
        "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer"
      )
        .addressToLocations({
          address: {
            SingleLine: address
          },
          outFields: ["*"]
        })
        .then(function(res) {
          resolve({
            longitude: res[0].attributes.DisplayX,
            latitude: res[0].attributes.DisplayY
          });
        })
        .catch(function(err) {
          reject(err);
        });
    });
  });
};

/**
 * Setting the extent means that we are centering the map around
 * a set of points and then zooming in as close as possible with
 * all points showing on the map.
 */
ArcGIS_v3_29.prototype.setExtent = function() {
  var points = this.multipoint.points;

  if (points.length === 0) {
    this.map.setExtent(
      new esri.geometry.Extent({
        xmin: -14177690,
        ymin: 2618510,
        xmax: -7084330,
        ymax: 6532090,
        spatialReference: {
          wkid: 102100
        }
      }),
      true
    );
    this.map.setZoom(4);
  }

  // There is only one address.
  else if (points.length === 1) {
    this.map.centerAndZoom(
      new esri.geometry.Point({
        longitude: points[0][0],
        latitude: points[0][1]
      }),
      16
    );
  }

  // There are multiple addresses.
  else if (points.length > 1) {
    var extent = this.multipoint.getExtent();
    var min = this.geolocationToCartesian(extent.xmin, extent.ymin);
    var max = this.geolocationToCartesian(extent.xmax, extent.ymax);

    this.map.setExtent(
      new esri.geometry.Extent({
        xmin: min.x,
        ymin: min.y,
        xmax: max.x,
        ymax: max.y,
        spatialReference: {
          wkid: 102100
        }
      }),
      true
    );
  }
};

/**
 * Converts latitude and longitude into x and y cartesian coordinates.
 *
 * @param lon
 * @param lat
 */
ArcGIS_v3_29.prototype.geolocationToCartesian = function(lon, lat) {
  var cartesian = this.webMercatorUtils.lngLatToXY(lon, lat);
  return { x: cartesian[0], y: cartesian[1] };
};

/**
 * 
 */
ArcGIS_v3_29.prototype.setView = function(view){
  this.map.setBasemap(view);
}

/**
 * Load all the map layers.  This creates the layers.  It doesn't
 * add them to the map.
 */
ArcGIS_v3_29.prototype.loadAllLayers = function() {
  console.log("Layers", ["FloodZoneLayer", "SeismicLayer"]);
  this.loadFloodZoneLayer();
  this.loadSeismicLayer();
};

/**
 * Add the requested layer.
 *
 * @param layer
 */
ArcGIS_v3_29.prototype.addLayer = function(layer) {
  this.map.addLayer(this[layer]);
};

/**
 * Remove the selected layer.
 *
 * @param layer
 */
ArcGIS_v3_29.prototype.removeLayer = function(layer) {
  this.map.removeLayer(this[layer]);
};

/**
 * Load the Seismic Layer.
 */
ArcGIS_v3_29.prototype.loadSeismicLayer = function() {
  this.Config.defaults.io.corsEnabledServers.push("earthquake.usgs.gov");

  require([
    "esri/layers/CSVLayer",
    "esri/Color",
    "esri/InfoTemplate",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/renderers/SimpleRenderer"
  ], function(
    CSVLayer,
    Color,
    InfoTemplate,
    SimpleMarkerSymbol,
    SimpleRenderer
  ) {
    this.SeismicLayer = new CSVLayer(
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.csv",
      {
        copyright: "USGS.gov"
      }
    );

    this.SeismicLayer.setRenderer(
      new SimpleRenderer(
        new SimpleMarkerSymbol("solid", 15, null, new Color([238, 69, 0, 0.5]))
      )
    );

    this.SeismicLayer.setInfoTemplate(
      new InfoTemplate("${type}", "${mag} magnitude <br> ${place}")
    );
  }.bind(this));
};

/**
 * Load the Flood Zone Layer.
 */
ArcGIS_v3_29.prototype.loadFloodZoneLayer = function() {
  require([
    "esri/layers/ArcGISDynamicMapServiceLayer",
    "esri/layers/ImageParameters"
  ], function(ArcGISDynamicMapServiceLayer, ImageParameters) {
    var imageParameters = new ImageParameters();
    imageParameters.format = "PNG32"; //set the image type to PNG24, note default is PNG8.
    imageParameters.layerIds = [28];
    imageParameters.layerOption = ImageParameters.LAYER_OPTION_SHOW;

    this.FloodZoneLayer = new ArcGISDynamicMapServiceLayer(
      "https://hazards.fema.gov/gis/nfhl/rest/services/public/NFHL/MapServer",
      {
        opacity: 1,
        imageParameters: imageParameters
      }
    );
  }.bind(this));
};
