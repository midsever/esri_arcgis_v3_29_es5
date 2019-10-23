function onLoad() {
  var MapService = new ArcGIS_v3_29({ container: "webmap" });

  MapService.init()
    .then(function() {
      MapService.addMarker("1202 Clay Road, Lititz, PA, 17543");
      MapService.addMarker("291 East Main Street, Leola, PA 17540");
      MapService.addMarker("2 E Kestrel Drive, Denver, PA 17517");
    })
    .catch(function(err) {
      console.log(err);
    });

  var suggestions = document.querySelector("#suggest .suggestions");
  var last = 0;

  document
    .querySelector("#suggest>input")
    .addEventListener("keyup", function() {
      if (this.value.length > 6) {
        last++;
        var current = last;
        MapService.suggest(this.value)
          .then(function(response) {
            if (current === last) {
              displaySuggestions(response);
            }
          })
          .catch(function(err) {
            console.error(err);
          });
      }
      else {
          displaySuggestions([]);
      }
    });

  document
    .querySelector("#seismicLayer")
    .addEventListener("change", function() {
      if (this.checked === true) {
        MapService.addLayer("SeismicLayer");
      } else {
        MapService.removeLayer("SeismicLayer");
      }
    });

  document
    .querySelector("#floodZoneLayer")
    .addEventListener("change", function() {
      if (this.checked === true) {
        MapService.addLayer("FloodZoneLayer");
      } else {
        MapService.removeLayer("FloodZoneLayer");
      }
    });

  function displaySuggestions(response) {
    console.log("suggestions", response);
    if (response.length > 0) {
      suggestions.show();
    } else {
      suggestions.hide();
    }
    suggestions.innerHTML = "";
    for (var i = 0; i < response.length; i++) {
      var node = document.createElement("DIV"); // Create a <li> node
      var textnode = document.createTextNode(response[i].text); // Create a text node
      node.appendChild(textnode);
      node.addEventListener("click", function() {
        console.log(this.innerHTML);
        MapService.addMarker(this.innerHTML)
          .then(function(marker) {
              // TODO: Create div with the address of the marker.
              addSelection(this.innerHTML, marker);
          }.bind(this))
          .catch(function(err) {
            console.error(err);
          });
        suggestions.hide();
        document.querySelector("#suggest>input").value = this.innerHTML;
      });
      node.classList.add("suggestion");
      suggestions.appendChild(node);
    }
  }

  function addSelection(address, marker){
    var node = document.createElement("DIV"); // Create a <li> node
    var textnode = document.createTextNode(address); // Create a text node
    node.appendChild(textnode);    
    node.addEventListener('click', function(){
        console.log(marker);
        MapService.removeMarker(marker);
    });
    document.querySelector('#selected').appendChild(node);
  }

  suggestions.show = function() {
    suggestions.classList.remove("hide");
    suggestions.classList.add("show");
  };

  suggestions.hide = function() {
    suggestions.classList.remove("show");
    suggestions.classList.add("hide");
  };
}
