const map = L.map('map', { zoomControl: false }).setView([4.142, -73.626], 12);

const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
});

const topoLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
  maxZoom: 17,
  attribution: '&copy; OpenTopoMap contributors'
});

const satLayer = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  {
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri'
  }
);

osmLayer.addTo(map);

const baseMaps = {
  osm: osmLayer,
  topo: topoLayer,
  sat: satLayer
};

L.control.zoom({ position: 'bottomright' }).addTo(map);

const ofertaLayer = L.layerGroup().addTo(map);
let planesParcialesLayer = null;
let zonaGeoecoUrbanaLayer = null;
let zonaGeoecoRuralLayer = null;

const uploadedLayersList = document.getElementById('uploadedLayersList');
const legendPanel = document.getElementById('legendPanel');
const toggleLegendBtn = document.getElementById('toggleLegendBtn');
const cerrarLegendBtn = document.getElementById('cerrarLegendBtn');
const baseMapSelect = document.getElementById('baseMapSelect');

toggleLegendBtn.addEventListener('click', () => {
  legendPanel.style.display = legendPanel.style.display === 'none' ? 'block' : 'none';
});

cerrarLegendBtn.addEventListener('click', () => {
  legendPanel.style.display = 'none';
});

baseMapSelect.addEventListener('change', (e) => {
  Object.values(baseMaps).forEach((layer) => {
    if (map.hasLayer(layer)) {
      map.removeLayer(layer);
    }
  });
  baseMaps[e.target.value].addTo(map);
});

document.getElementById('baseMapBtn').addEventListener('click', () => {
  legendPanel.style.display = 'block';
});

document.getElementById('ubicacionBtn').addEventListener('click', () => {
  if (!navigator.geolocation) {
    alert('Tu navegador no soporta geolocalización.');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      map.setView([lat, lng], 16);

      L.circleMarker([lat, lng], {
        radius: 8,
        color: '#1d4ed8',
        fillColor: '#60a5fa',
        fillOpacity: 0.9
      })
        .addTo(map)
        .bindPopup('Tu ubicación actual')
        .openPopup();
    },
    () => {
      alert('No fue posible obtener tu ubicación.');
    }
  );
});

proj4.defs(
  "EPSG:9377",
  "+proj=tmerc +lat_0=4 +lon_0=-73 +k=0.9992 +x_0=5000000 +y_0=2000000 +ellps=GRS80 +units=m +no_defs"
);

let consultaMarker = null;

let consultaLayer = null;

function limpiarConsultaGrafica() {
  if (consultaMarker) {
    map.removeLayer(consultaMarker);
    consultaMarker = null;
  }

  if (consultaLayer) {
    map.removeLayer(consultaLayer);
    consultaLayer = null;
  }
}

function obtenerValorPropiedad(props, posiblesCampos) {
  for (const campo of posiblesCampos) {
    if (props[campo] !== undefined && props[campo] !== null && props[campo] !== '') {
      return String(props[campo]).trim();
    }
  }
  return null;
}

function resaltarGeoJSONFiltrado(layerOriginal, filtro, estilo, popupTitulo) {
  if (!layerOriginal) return false;

  const coincidencias = [];

  layerOriginal.eachLayer((layer) => {
    if (layer.feature && layer.feature.properties) {
      const props = layer.feature.properties;
      if (filtro(props)) {
        coincidencias.push(layer.feature);
      }
    }
  });

  if (coincidencias.length === 0) return false;

  consultaLayer = L.geoJSON(
    { type: 'FeatureCollection', features: coincidencias },
    {
      style: estilo,
      onEachFeature: function (feature, layer) {
        const props = feature.properties || {};
        let content = `<b>${popupTitulo}</b><br>`;
        Object.keys(props).forEach((key) => {
          content += `${key}: ${props[key]}<br>`;
        });
        layer.bindPopup(content);
      }
    }
  ).addTo(map);

  const bounds = consultaLayer.getBounds();
  if (bounds.isValid()) {
    map.fitBounds(bounds);
  }

  return true;
}

function buscarPorMunicipio(codigoMunicipio) {
  const estilos = {
    planes: { color: '#f97316', weight: 4, fillOpacity: 0.35 },
    urbana: { color: '#16a34a', weight: 4, fillOpacity: 0.30 },
    rural: { color: '#7c3aed', weight: 4, fillOpacity: 0.22, dashArray: '6,4' }
  };

  let encontrado = false;

  encontrado = resaltarGeoJSONFiltrado(
    zonaGeoecoUrbanaLayer,
    (props) => {
      const cod = obtenerValorPropiedad(props, ['CODIGO_MUNICIPIO', 'codigo_municipio']);
      return cod === codigoMunicipio;
    },
    estilos.urbana,
    `Consulta por municipio ${codigoMunicipio} - Zona geoeconómica urbana`
  ) || encontrado;

  encontrado = resaltarGeoJSONFiltrado(
    zonaGeoecoRuralLayer,
    (props) => {
      const cod = obtenerValorPropiedad(props, ['CODIGO_MUNICIPIO', 'codigo_municipio']);
      return cod === codigoMunicipio;
    },
    estilos.rural,
    `Consulta por municipio ${codigoMunicipio} - Zona geoeconómica rural`
  ) || encontrado;

  encontrado = resaltarGeoJSONFiltrado(
    planesParcialesLayer,
    (props) => {
      const cod = obtenerValorPropiedad(props, ['CODIGO_MUNICIPIO', 'codigo_municipio']);
      return cod === codigoMunicipio;
    },
    estilos.planes,
    `Consulta por municipio ${codigoMunicipio} - Planes parciales`
  ) || encontrado;

  return encontrado;
}

function buscarPorDepartamento(codigoDepartamento) {
  const estilos = {
    planes: { color: '#f97316', weight: 4, fillOpacity: 0.35 },
    urbana: { color: '#16a34a', weight: 4, fillOpacity: 0.30 },
    rural: { color: '#7c3aed', weight: 4, fillOpacity: 0.22, dashArray: '6,4' }
  };

  let encontrado = false;

  encontrado = resaltarGeoJSONFiltrado(
    zonaGeoecoUrbanaLayer,
    (props) => {
      const cod = obtenerValorPropiedad(props, ['CODIGO_MUNICIPIO', 'codigo_municipio']);
      return cod && cod.substring(0, 2) === codigoDepartamento;
    },
    estilos.urbana,
    `Consulta por departamento ${codigoDepartamento} - Zona geoeconómica urbana`
  ) || encontrado;

  encontrado = resaltarGeoJSONFiltrado(
    zonaGeoecoRuralLayer,
    (props) => {
      const cod = obtenerValorPropiedad(props, ['CODIGO_MUNICIPIO', 'codigo_municipio']);
      return cod && cod.substring(0, 2) === codigoDepartamento;
    },
    estilos.rural,
    `Consulta por departamento ${codigoDepartamento} - Zona geoeconómica rural`
  ) || encontrado;

  encontrado = resaltarGeoJSONFiltrado(
    planesParcialesLayer,
    (props) => {
      const cod = obtenerValorPropiedad(props, ['CODIGO_MUNICIPIO', 'codigo_municipio']);
      return cod && cod.substring(0, 2) === codigoDepartamento;
    },
    estilos.planes,
    `Consulta por departamento ${codigoDepartamento} - Planes parciales`
  ) || encontrado;

  return encontrado;
}

function buscarPorPredial30(codigoPredial) {
  const posiblesCamposPredial = [
    'CODIGO_PREDIAL',
    'codigo_predial',
    'NUMERO_PREDIAL',
    'numero_predial',
    'PREDIAL',
    'predial',
    'CEDULA_CATASTRAL',
    'cedula_catastral',
    'CHIP',
    'chip'
  ];

  const estilos = {
    predial: { color: '#dc2626', weight: 5, fillOpacity: 0.35 }
  };

  let encontrado = false;

  const buscarEnLayer = (layerOriginal, titulo) => {
    return resaltarGeoJSONFiltrado(
      layerOriginal,
      (props) => {
        const valor = obtenerValorPropiedad(props, posiblesCamposPredial);
        if (!valor) return false;
        const soloDigitos = valor.replace(/\D/g, '');
        return soloDigitos === codigoPredial;
      },
      estilos.predial,
      titulo
    );
  };

  encontrado = buscarEnLayer(zonaGeoecoUrbanaLayer, `Consulta por predial ${codigoPredial}`) || encontrado;
  encontrado = buscarEnLayer(zonaGeoecoRuralLayer, `Consulta por predial ${codigoPredial}`) || encontrado;
  encontrado = buscarEnLayer(planesParcialesLayer, `Consulta por predial ${codigoPredial}`) || encontrado;

  return encontrado;
}
document.getElementById('limpiarBtn').addEventListener('click', () => {
  document.getElementById('direccionInput').value = '';
  document.getElementById('predialInput').value = '';
  document.getElementById('norteInput').value = '';
  document.getElementById('esteInput').value = '';

  if (consultaMarker) {
    map.removeLayer(consultaMarker);
    consultaMarker = null;
  }
});

fetch('oferta.json')
  .then((response) => response.json())
  .then((data) => {
    ofertaLayer.clearLayers();

    data.forEach((inmueble) => {
      const popup = `
        <b>${inmueble.title}</b><br>
        Tipo: ${inmueble.property_type}<br>
        Municipio: ${inmueble.municipality}<br>
        Sector: ${inmueble.sector}<br>
        Precio: $${Number(inmueble.price).toLocaleString()}<br>
        Área: ${inmueble.area} m²<br>
        Teléfono: ${inmueble.contact_phone}<br>
        Descripción: ${inmueble.description}
      `;

      L.marker([inmueble.latitude, inmueble.longitude])
        .bindPopup(popup)
        .addTo(ofertaLayer);
    });
  })
  .catch((error) => {
    console.error('Error cargando oferta.json:', error);
  });

function cargarPlanesParciales() {
  fetch('data/geojson/planes_parciales.geojson.geojson')
    .then((response) => {
      if (!response.ok) {
        throw new Error(`No se pudo cargar planes_parciales.geojson.geojson: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      if (planesParcialesLayer) {
        map.removeLayer(planesParcialesLayer);
      }

      planesParcialesLayer = L.geoJSON(data, {
        style: {
          color: '#f97316',
          weight: 2,
          fillOpacity: 0.2
        },
        onEachFeature: function (feature, layer) {
          const props = feature.properties || {};
          const nombre = props.NOMBRE_PP || 'Plan parcial sin nombre';

          let content = `<b>Plan parcial</b><br>Nombre: ${nombre}<br>`;

          Object.keys(props).forEach((key) => {
            if (key !== 'NOMBRE_PP') {
              content += `${key}: ${props[key]}<br>`;
            }
          });

          layer.bindPopup(content);
        }
      });
    })
    .catch((error) => {
      console.error('Error cargando planes_parciales.geojson:', error);
      alert('No fue posible cargar la capa de planes parciales.');
    });
}

function construirPopupZonaGeoeco(props, tipoZona) {
  const codigoZona =
    props.CODIGO_ZONA_GEOECONOMICA ||
    props.codigo_zona_geoeconomica ||
    props.CODIGO_ZONA ||
    props.codigo_zona ||
    'Sin dato';

  const valorHectarea =
    props.VALOR_HECTAREA ||
    props.valor_hectarea ||
    'Sin dato';

  const subzonaFisica =
    props.SUBZONA_FISICA ||
    props.subzona_fisica ||
    'Sin dato';

  const codigoMunicipio =
    props.CODIGO_MUNICIPIO ||
    props.codigo_municipio ||
    'Sin dato';

  const codigo =
    props.CODIGO ||
    props.codigo ||
    'Sin dato';

  return `
    <b>Zona geoeconómica ${tipoZona}</b><br>
    Código: ${codigo}<br>
    Código zona: ${codigoZona}<br>
    Valor hectárea: ${valorHectarea}<br>
    Subzona física: ${subzonaFisica}<br>
    Código municipio: ${codigoMunicipio}
  `;
}

function cargarZonaGeoecoUrbana() {
  fetch('data/geojson/u_zona_homogenea_geoeconomica.geojson')
    .then((response) => {
      if (!response.ok) {
        throw new Error(`No se pudo cargar u_zona_homogenea_geoeconomica.geojson: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      if (zonaGeoecoUrbanaLayer) {
        map.removeLayer(zonaGeoecoUrbanaLayer);
      }

      zonaGeoecoUrbanaLayer = L.geoJSON(data, {
        style: {
          color: '#22c55e',
          weight: 1.5,
          fillOpacity: 0.15
        },
        onEachFeature: function (feature, layer) {
          const props = feature.properties || {};
          layer.bindPopup(construirPopupZonaGeoeco(props, 'urbana'));
        }
      });
    })
    .catch((error) => {
      console.error('Error cargando u_zona_homogenea_geoeconomica.geojson:', error);
      alert('No fue posible cargar la capa de zonas geoeconómicas urbanas.');
    });
}

function cargarZonaGeoecoRural() {
  fetch('data/geojson/r_zona_homogenea_geoeconomica.geojson')
    .then((response) => {
      if (!response.ok) {
        throw new Error(`No se pudo cargar r_zona_homogenea_geoeconomica.geojson: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      if (zonaGeoecoRuralLayer) {
        map.removeLayer(zonaGeoecoRuralLayer);
      }

      zonaGeoecoRuralLayer = L.geoJSON(data, {
        style: {
          color: '#8b5cf6',
          weight: 1.5,
          fillOpacity: 0.12,
          dashArray: '6, 4'
        },
        onEachFeature: function (feature, layer) {
          const props = feature.properties || {};
          layer.bindPopup(construirPopupZonaGeoeco(props, 'rural'));
        }
      });
    })
    .catch((error) => {
      console.error('Error cargando r_zona_homogenea_geoeconomica.geojson:', error);
      alert('No fue posible cargar la capa de zonas geoeconómicas rurales.');
    });
}

document.getElementById('toggleOferta').addEventListener('change', (e) => {
  if (e.target.checked) {
    map.addLayer(ofertaLayer);
  } else {
    map.removeLayer(ofertaLayer);
  }
});

document.getElementById('togglePlanesParciales').addEventListener('change', (e) => {
  if (e.target.checked) {
    if (planesParcialesLayer) {
      map.addLayer(planesParcialesLayer);
      const bounds = planesParcialesLayer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds);
      }
    } else {
      cargarPlanesParciales();
      setTimeout(() => {
        if (planesParcialesLayer) {
          map.addLayer(planesParcialesLayer);
          const bounds = planesParcialesLayer.getBounds();
          if (bounds.isValid()) {
            map.fitBounds(bounds);
          }
        }
      }, 800);
    }
  } else {
    if (planesParcialesLayer) {
      map.removeLayer(planesParcialesLayer);
    }
  }
});

document.getElementById('toggleZonaGeoecoUrbana').addEventListener('change', (e) => {
  if (e.target.checked) {
    if (zonaGeoecoUrbanaLayer) {
      map.addLayer(zonaGeoecoUrbanaLayer);
      const bounds = zonaGeoecoUrbanaLayer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds);
      }
    } else {
      cargarZonaGeoecoUrbana();
      setTimeout(() => {
        if (zonaGeoecoUrbanaLayer) {
          map.addLayer(zonaGeoecoUrbanaLayer);
          const bounds = zonaGeoecoUrbanaLayer.getBounds();
          if (bounds.isValid()) {
            map.fitBounds(bounds);
          }
        }
      }, 800);
    }
  } else {
    if (zonaGeoecoUrbanaLayer) {
      map.removeLayer(zonaGeoecoUrbanaLayer);
    }
  }
});

document.getElementById('toggleZonaGeoecoRural').addEventListener('change', (e) => {
  if (e.target.checked) {
    if (zonaGeoecoRuralLayer) {
      map.addLayer(zonaGeoecoRuralLayer);
      const bounds = zonaGeoecoRuralLayer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds);
      }
    } else {
      cargarZonaGeoecoRural();
      setTimeout(() => {
        if (zonaGeoecoRuralLayer) {
          map.addLayer(zonaGeoecoRuralLayer);
          const bounds = zonaGeoecoRuralLayer.getBounds();
          if (bounds.isValid()) {
            map.fitBounds(bounds);
          }
        }
      }, 800);
    }
  } else {
    if (zonaGeoecoRuralLayer) {
      map.removeLayer(zonaGeoecoRuralLayer);
    }
  }
});

document.getElementById('cargarGeojsonBtn').addEventListener('click', () => {
  const fileInput = document.getElementById('geojsonFile');
  const file = fileInput.files[0];

  if (!file) {
    alert('Selecciona un archivo GeoJSON.');
    return;
  }

  const reader = new FileReader();

  reader.onload = function (event) {
    try {
      const geojson = JSON.parse(event.target.result);

      const uploadedLayer = L.geoJSON(geojson, {
        style: {
          color: '#f97316',
          weight: 2,
          fillOpacity: 0.2
        },
        onEachFeature: function (feature, layer) {
          const props = feature.properties || {};
          let content = '<b>Capa cargada</b><br>';

          Object.keys(props).forEach((key) => {
            content += `${key}: ${props[key]}<br>`;
          });

          layer.bindPopup(content);
        }
      }).addTo(map);

      const bounds = uploadedLayer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds);
      }

      uploadedLayersList.innerHTML += `<div class="legend-item"><span class="legend-color orange"></span>${file.name}</div>`;
    } catch (error) {
      alert('El archivo no es un GeoJSON válido.');
      console.error(error);
    }
  };

  reader.readAsText(file);
});
proj4.defs(
  "EPSG:9377",
  "+proj=tmerc +lat_0=4 +lon_0=-73 +k=0.9992 +x_0=5000000 +y_0=2000000 +ellps=GRS80 +units=m +no_defs"
);

document.getElementById('consultarBtn').addEventListener('click', () => {
  const sistema = document.getElementById('sistemaRef').value;
  const norte = document.getElementById('norteInput').value.trim();
  const este = document.getElementById('esteInput').value.trim();
  const predial = document.getElementById('predialInput').value.trim();
  const direccion = document.getElementById('direccionInput').value.trim();

  limpiarConsultaGrafica();

  if (norte && este) {
    const norteNum = parseFloat(norte);
    const esteNum = parseFloat(este);

    if (isNaN(norteNum) || isNaN(esteNum)) {
      alert('Las coordenadas deben ser numéricas.');
      return;
    }

    let latLng;

    if (sistema.includes('Origen Nacional')) {
      const resultado = proj4('EPSG:9377', 'EPSG:4326', [esteNum, norteNum]);
      latLng = [resultado[1], resultado[0]];
    } else if (sistema.includes('WGS84')) {
      latLng = [norteNum, esteNum];
    } else {
      alert('Por ahora la consulta funcional quedó habilitada para Origen Nacional y WGS84.');
      return;
    }

    map.setView(latLng, 18);

    consultaMarker = L.marker(latLng)
      .addTo(map)
      .bindPopup(`
        <b>Consulta por coordenadas</b><br>
        Sistema: ${sistema}<br>
        Norte: ${norte}<br>
        Este: ${este}<br>
        Lat: ${latLng[0].toFixed(6)}<br>
        Lng: ${latLng[1].toFixed(6)}
      `)
      .openPopup();

    return;
  }

  if (predial) {
    const soloDigitos = predial.replace(/\D/g, '');

    if (soloDigitos.length === 30) {
      const encontrado = buscarPorPredial30(soloDigitos);

      if (!encontrado) {
        alert('No se encontró el predio. Para búsqueda exacta por 30 dígitos necesitas una capa que contenga ese atributo predial.');
      }
      return;
    }

    if (soloDigitos.length === 5) {
      const encontrado = buscarPorMunicipio(soloDigitos);

      if (!encontrado) {
        alert(`No se encontraron entidades para el código DIVIPOLA municipal ${soloDigitos}.`);
      }
      return;
    }

    if (soloDigitos.length === 2) {
      const encontrado = buscarPorDepartamento(soloDigitos);

      if (!encontrado) {
        alert(`No se encontraron entidades para el código de departamento ${soloDigitos}.`);
      }
      return;
    }

    alert('El campo acepta 30 dígitos para predial, 5 dígitos para municipio DIVIPOLA o 2 dígitos para departamento.');
    return;
  }

  if (direccion) {
    alert(`La consulta por dirección aún está pendiente de geocodificación. Valor ingresado: ${direccion}`);
    return;
  }

  alert('Ingresa una dirección, código predial, DIVIPOLA o coordenadas.');
});

document.getElementById('limpiarBtn').addEventListener('click', () => {
  document.getElementById('direccionInput').value = '';
  document.getElementById('predialInput').value = '';
  document.getElementById('norteInput').value = '';
  document.getElementById('esteInput').value = '';

  limpiarConsultaGrafica();
});