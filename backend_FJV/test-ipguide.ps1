# Script para probar la API de IP Guide
$baseUrl = "http://localhost:3000/api"

Write-Host "Probando API de IP Guide..." -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url
    )
    
    Write-Host "`nProbando: $Name" -ForegroundColor Yellow
    Write-Host "URL: $Url" -ForegroundColor Gray
    
    try {
        $response = Invoke-WebRequest -Uri $Url -Method GET
        $content = $response.Content | ConvertFrom-Json
        
        if ($content.success) {
            Write-Host "Exito!" -ForegroundColor Green
            Write-Host "Respuesta:" -ForegroundColor Cyan
            $content | ConvertTo-Json -Depth 10
        } else {
            Write-Host "Error en la respuesta" -ForegroundColor Red
            Write-Host $content | ConvertTo-Json
        }
    }
    catch {
        Write-Host "Error en la peticion: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Probar endpoints con ambas rutas (con y sin guión)
Test-Endpoint -Name "IP Actual del Servidor (sin guion)" -Url "$baseUrl/ipguide/current"
Test-Endpoint -Name "IP Actual del Servidor (con guion)" -Url "$baseUrl/ip-guide/current"
Test-Endpoint -Name "IP Especifica (sin guion)" -Url "$baseUrl/ipguide/ip/181.177.24.110"
Test-Endpoint -Name "IP Especifica (con guion)" -Url "$baseUrl/ip-guide/ip/181.177.24.110"
Test-Endpoint -Name "Red CIDR (sin guion)" -Url "$baseUrl/ipguide/network/181.177.24.0/24"
Test-Endpoint -Name "Red CIDR (con guion)" -Url "$baseUrl/ip-guide/network/181.177.24.0/24"
Test-Endpoint -Name "Sistema Autonomo (sin guion)" -Url "$baseUrl/ipguide/asn/264642"
Test-Endpoint -Name "Sistema Autonomo (con guion)" -Url "$baseUrl/ip-guide/asn/264642"
Test-Endpoint -Name "Validar IP Valida (sin guion)" -Url "$baseUrl/ipguide/validate/ip/192.168.1.1"
Test-Endpoint -Name "Validar IP Valida (con guion)" -Url "$baseUrl/ip-guide/validate/ip/192.168.1.1"

Write-Host "`nPruebas completadas!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host "Ambas rutas (con y sin guion) deberian funcionar correctamente" -ForegroundColor Yellow 