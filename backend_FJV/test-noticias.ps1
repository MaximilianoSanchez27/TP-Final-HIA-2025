# Script para probar las rutas de noticias y vistas
$baseUrl = "http://localhost:3000/api"

Write-Host "Probando rutas de noticias y vistas..." -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [string]$Body = $null
    )
    
    Write-Host "`nProbando: $Name" -ForegroundColor Yellow
    Write-Host "URL: $Url" -ForegroundColor Gray
    Write-Host "Metodo: $Method" -ForegroundColor Gray
    
    try {
        if ($Body) {
            $headers = @{
                "Content-Type" = "application/json"
            }
            $response = Invoke-WebRequest -Uri $Url -Method $Method -Body $Body -Headers $headers
        } else {
            $response = Invoke-WebRequest -Uri $Url -Method $Method
        }
        
        $content = $response.Content | ConvertFrom-Json
        
        if ($content.status -eq "1" -or $content.success -eq $true) {
            Write-Host "Exito!" -ForegroundColor Green
            Write-Host "Respuesta:" -ForegroundColor Cyan
            $content | ConvertTo-Json -Depth 5
        } else {
            Write-Host "Error en la respuesta" -ForegroundColor Red
            Write-Host $content | ConvertTo-Json
        }
    }
    catch {
        Write-Host "Error en la peticion: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            Write-Host "Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        }
    }
}

# 1. Probar obtener noticias (público)
Test-Endpoint -Name "Obtener Noticias" -Url "$baseUrl/noticias"

# 2. Probar obtener noticia específica (público, registra vista automáticamente)
Test-Endpoint -Name "Obtener Noticia por ID" -Url "$baseUrl/noticias/4"

# 3. Probar registrar vista manualmente (público)
Test-Endpoint -Name "Registrar Vista Manual" -Url "$baseUrl/noticias/4/vista" -Method "POST"

# 4. Probar obtener estadísticas de vistas (requiere admin - debería fallar sin token)
Test-Endpoint -Name "Obtener Estadisticas de Vistas (sin auth)" -Url "$baseUrl/noticias/4/vistas"

# 5. Probar categorías (público)
Test-Endpoint -Name "Obtener Categorias" -Url "$baseUrl/noticias/categorias"

Write-Host "`nPruebas completadas!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host "Nota: La ruta de estadísticas de vistas requiere autenticación de admin" -ForegroundColor Yellow 