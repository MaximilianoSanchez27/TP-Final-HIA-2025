# API de IP Guide

Esta API permite consultar información detallada de direcciones IP, redes CIDR y Sistemas Autónomos (ASN) utilizando el servicio [IP Guide](https://ip.guide/).

## Endpoints Disponibles

### 1. Obtener información de la IP actual del servidor

**GET** `/api/ipguide/current`

Obtiene información de la IP pública del servidor donde se ejecuta la aplicación.

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "ip": "54.198.141.170",
    "red": {
      "cidr": "54.198.0.0/16",
      "hosts": {
        "start": "54.198.0.1",
        "end": "54.198.255.254"
      },
      "sistemaAutonomo": {
        "asn": 14618,
        "nombre": "AMAZON-AES",
        "organizacion": "Amazon.com, Inc.",
        "pais": "US",
        "rir": "ARIN"
      }
    },
    "ubicacion": {
      "ciudad": "Ashburn",
      "pais": "United States",
      "zonaHoraria": "America/New_York",
      "coordenadas": {
        "latitud": 39.0469,
        "longitud": -77.4903
      }
    }
  }
}
```

### 2. Obtener información de una IP específica

**GET** `/api/ipguide/ip/:ip`

Obtiene información detallada de una dirección IP específica.

**Parámetros:**
- `ip` (string): Dirección IP a consultar (ej: "181.177.24.110")

**Ejemplo:**
```
GET /api/ipguide/ip/181.177.24.110
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "ip": "181.177.24.110",
    "red": {
      "cidr": "181.177.24.0/24",
      "hosts": {
        "start": "181.177.24.1",
        "end": "181.177.24.254"
      },
      "sistemaAutonomo": {
        "asn": 264642,
        "nombre": "TELESISTEMA S.R.L.",
        "organizacion": "TELESISTEMA S.R.L.",
        "pais": "AR",
        "rir": "LACNIC"
      }
    },
    "ubicacion": {
      "ciudad": "San Salvador de Jujuy",
      "pais": "Argentina",
      "zonaHoraria": "America/Argentina/Jujuy",
      "coordenadas": {
        "latitud": -24.1882,
        "longitud": -65.291
      }
    }
  }
}
```

### 3. Obtener información de una red CIDR

**GET** `/api/ipguide/network/:cidr`

Obtiene información de una red completa especificada en notación CIDR.

**Parámetros:**
- `cidr` (string): Notación CIDR de la red (ej: "181.177.24.0/24")

**Ejemplo:**
```
GET /api/ipguide/network/181.177.24.0/24
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "cidr": "181.177.24.0/24",
    "hosts": {
      "start": "181.177.24.1",
      "end": "181.177.24.254"
    },
    "sistemaAutonomo": {
      "asn": 264642,
      "nombre": "TELESISTEMA S.R.L.",
      "organizacion": "TELESISTEMA S.R.L.",
      "pais": "AR",
      "rir": "LACNIC"
    }
  }
}
```

### 4. Obtener información de un Sistema Autónomo (ASN)

**GET** `/api/ipguide/asn/:asn`

Obtiene información de un Sistema Autónomo por su número ASN.

**Parámetros:**
- `asn` (number): Número del Sistema Autónomo (ej: 264642)

**Ejemplo:**
```
GET /api/ipguide/asn/264642
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "asn": 264642,
    "name": "TELESISTEMA S.R.L.",
    "organization": "TELESISTEMA S.R.L.",
    "country": "AR",
    "rir": "LACNIC"
  }
}
```

### 5. Validar formato de una IP

**GET** `/api/ipguide/validate/ip/:ip`

Valida si una cadena tiene el formato correcto de una dirección IP.

**Parámetros:**
- `ip` (string): IP a validar

**Ejemplo:**
```
GET /api/ipguide/validate/ip/192.168.1.1
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "ip": "192.168.1.1",
    "esValida": true
  }
}
```

### 6. Validar formato de una notación CIDR

**GET** `/api/ipguide/validate/cidr/:cidr`

Valida si una cadena tiene el formato correcto de notación CIDR.

**Parámetros:**
- `cidr` (string): CIDR a validar

**Ejemplo:**
```
GET /api/ipguide/validate/cidr/192.168.1.0/24
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "cidr": "192.168.1.0/24",
    "esValida": true
  }
}
```

## Códigos de Error

### 400 - Bad Request
- IP o CIDR con formato inválido
- Parámetros faltantes

### 404 - Not Found
- IP o red no encontrada en la base de datos de IP Guide

### 500 - Internal Server Error
- Error en la comunicación con IP Guide
- Error interno del servidor

## Ejemplos de Uso con cURL

### Consultar IP específica
```bash
curl -X GET "http://localhost:3000/api/ipguide/ip/181.177.24.110"
```

### Consultar red CIDR
```bash
curl -X GET "http://localhost:3000/api/ipguide/network/181.177.24.0/24"
```

### Consultar ASN
```bash
curl -X GET "http://localhost:3000/api/ipguide/asn/264642"
```

### Validar formato de IP
```bash
curl -X GET "http://localhost:3000/api/ipguide/validate/ip/192.168.1.1"
```

## Notas Importantes

1. **Rate Limiting**: La API de IP Guide puede tener límites de velocidad. Se recomienda implementar caché para consultas frecuentes.

2. **Datos de Ubicación**: Los datos de ubicación geográfica son proporcionados por MaxMind y pueden no ser 100% precisos.

3. **Formato de Respuesta**: Todas las respuestas siguen el formato estándar de la API con campos `success` y `data` o `error`.

4. **Validación**: La API valida automáticamente el formato de IPs y CIDRs antes de hacer las consultas.

## Integración con el Sistema

Esta API puede ser útil para:
- Geolocalización de usuarios
- Análisis de tráfico por región
- Validación de IPs en formularios
- Auditoría de seguridad
- Estadísticas de acceso por país/organización 