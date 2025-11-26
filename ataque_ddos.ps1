# --- CONFIGURACIÓN ---
$Url = "http://localhost:8888" 
$TotalPeticiones = 100 

Write-Host "INICIANDO ATAQUE SIMULADO CONTRA $Url..." -ForegroundColor Cyan
Write-Host "OBJETIVO: Saturar Nginx para ver errores 503." -ForegroundColor Gray

# Definimos el bloque de trabajo que ejecutará cada "soldado"
$Block = {
    param($TargetUrl)
    
    # --- CORRECCIÓN CRÍTICA ---
    # Esta línea debe ir DENTRO del bloque para que cada trabajo ignore el SSL
    [System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
    
    $results = @()
    # Cada trabajo lanza 10 peticiones rápidas
    for ($i = 0; $i -lt 10; $i++) {
        try {
            $req = [System.Net.WebRequest]::Create($TargetUrl)
            $req.Method = "HEAD"
            $req.Timeout = 2000
            
            # Intentamos obtener respuesta
            $resp = $req.GetResponse()
            $results += "ACEPTADA"
            $resp.Close()
        }
        catch {
            # Si falla, analizamos por qué
            if ($_.Exception.Message -like "*503*") {
                $results += "BLOQUEADA (503)"
            }
            elseif ($_.Exception.Message -like "*502*") {
                $results += "ERROR 502 (Nginx Saturado)"
            }
            else {
                $results += "ERROR: $($_.Exception.Message)"
            }
        }
    }
    return $results
}

Write-Host "Lanzando 10 trabajos en paralelo (100 peticiones en total)..." -ForegroundColor Yellow

# Lanzamos los trabajos
$jobs = 1..10 | ForEach-Object {
    Start-Job -ScriptBlock $Block -ArgumentList $Url
}

# Esperamos resultados
Write-Host "Bombardeando... Espere unos segundos..." -ForegroundColor Yellow
$results = $jobs | Receive-Job -Wait | ForEach-Object { $_ }

# Limpieza de trabajos
Get-Job | Remove-Job

# Mostrar resultados visuales limpios (Sin emojis)
$bloqueadas = 0
$aceptadas = 0

Write-Host "`n--- RESULTADOS ---"
foreach ($res in $results) {
    if ($res -like "*BLOQUEADA*") { 
        Write-Host "[X] $res" -ForegroundColor Red 
        $bloqueadas++
    }
    elseif ($res -like "ACEPTADA") { 
        Write-Host "[OK] $res" -ForegroundColor Green 
        $aceptadas++
    }
    else { 
        Write-Host "[?] $res" -ForegroundColor White 
    }
}

Write-Host "`n------------------------------------------------"
Write-Host "REPORTE FINAL"
Write-Host "   Aceptadas: $aceptadas"
Write-Host "   Mitigadas: $bloqueadas"
Write-Host "------------------------------------------------"

if ($bloqueadas -gt 0) {
    Write-Host "EXITO: Se detectaron bloqueos (Rate Limiting activado)." -ForegroundColor Green
}
else {
    Write-Host "ATENCION: Todo paso. Si quieres ver bloqueos, baja el limite en Nginx a 1r/s." -ForegroundColor Yellow
}