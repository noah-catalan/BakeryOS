# Guía y Plantilla de Estilos de Impresión A4 para TFG (Optimizado para WeasyPrint)

Esta guía técnica está diseñada para que un agente de IA pueda estructurar y generar de manera autónoma un Trabajo de Fin de Grado (TFG) o memoria técnica impecable en formato PDF partiendo de un documento HTML/CSS, utilizando **WeasyPrint** como motor de renderizado.

---

## 1. Conceptos Clave de Diseño y Maquetación Web-to-PDF

WeasyPrint no es un navegador convencional; es un motor de renderizado orientado al estándar **CSS Paged Media Module**. Para lograr un acabado de imprenta premium y profesional, se deben seguir estrictamente estas directrices:

1. **Unidades de Medida**: Utiliza siempre puntos (`pt`) para tamaños de tipografía y milímetros (`mm`) para dimensiones de página, márgenes y espaciados de cajas. Evita `px` o `em` en layouts de impresión.
2. **Control de Saltos de Página**:
   * Forzar salto de página tras secciones principales: `page-break-after: always;`.
   * Evitar que bloques o cajas de código se partan a la mitad entre dos páginas: `page-break-inside: avoid;`.
3. **Márgenes de Página y Elementos Marginales**: Controlados mediante la directiva `@page`. Permite inyectar dinámicamente el nombre del alumno en el pie de página izquierdo (`@bottom-left`) y el contador de páginas real en el derecho (`@bottom-right`).

---

## 2. Código Base Estructurado (Boilerplate HTML/CSS)

Indica al agente que utilice la siguiente plantilla base. Contiene la configuración CSS para impresión A4, la portada académica (sin asignaturas ni logos superfluos), el índice automatizado y la estructura de contenidos.

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Título del Trabajo de Fin de Grado (TFG)</title>
  <style>
    /* ==========================================
       1. CONFIGURACIÓN DE PÁGINA E IMPRESIÓN A4
       ========================================== */
    @page {
      size: A4;
      margin: 20mm; /* Margen estándar académico */
      
      /* Pie de página izquierdo: Autoría */
      @bottom-left {
        content: "Autor: Nombre Completo del Alumno | TFG";
        font-family: Arial, sans-serif;
        font-size: 8pt;
        color: #555555;
        border-top: 0.5px solid #d0d0d0;
        padding-top: 3mm;
        width: 100%;
      }
      
      /* Pie de página derecho: Numeración Dinámica */
      @bottom-right {
        content: "Página " counter(page) " de " counter(pages);
        font-family: Arial, sans-serif;
        font-size: 8pt;
        color: #555555;
        border-top: 0.5px solid #d0d0d0;
        padding-top: 3mm;
      }
    }
    
    * {
      box-sizing: border-box;
    }
    
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #222222;
      line-height: 1.6;
      font-size: 10.5pt;
      background-color: #ffffff;
    }
    
    /* ==========================================
       2. ESTRUCTURA DE LA PORTADA
       ========================================== */
    .cover-page {
      height: 240mm; /* Altura máxima ajustada a la página A4 */
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      page-break-after: always;
      padding-top: 15mm;
      padding-bottom: 15mm;
    }
    
    .cover-header {
      border-bottom: 2px solid #111111;
      padding-bottom: 5mm;
    }
    
    .institution-name {
      font-size: 10pt;
      color: #444444;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      font-weight: bold;
    }
    
    .department-name {
      font-size: 8.5pt;
      margin-top: 1.5mm;
      color: #666666;
    }
    
    .cover-title-container {
      margin-top: 40mm;
      margin-bottom: 40mm;
    }
    
    .cover-title {
      font-size: 26pt;
      font-weight: bold;
      line-height: 1.2;
      color: #000000;
      margin-bottom: 6mm;
    }
    
    .cover-subtitle {
      font-size: 14pt;
      color: #444444;
      margin-bottom: 10mm;
      line-height: 1.4;
    }
    
    .cover-footer {
      border-top: 1px solid #e0e0e0;
      padding-top: 8mm;
      font-size: 10.5pt;
    }
    
    .metadata-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 5mm;
    }
    
    .metadata-label {
      font-weight: bold;
      color: #555555;
    }
    
    /* ==========================================
       3. ESTRUCTURA DEL ÍNDICE (TOC)
       ========================================== */
    .index-page {
      page-break-after: always;
      padding-top: 10mm;
    }
    
    .section-title {
      font-size: 16pt;
      font-weight: bold;
      border-bottom: 1px solid #111111;
      padding-bottom: 3mm;
      margin-bottom: 8mm;
    }
    
    .index-list {
      margin-top: 10mm;
    }
    
    .index-item {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 6mm;
      font-size: 11pt;
    }
    
    .index-name {
      background-color: #ffffff;
      padding-right: 4px;
    }
    
    .index-dots {
      flex: 1;
      border-bottom: 1px dotted #888888;
      margin: 0 4px 3px 4px;
    }
    
    .index-number {
      font-weight: bold;
      background-color: #ffffff;
      padding-left: 4px;
    }
    
    /* ==========================================
       4. ESTILOS DE CONTENIDO Y TIPOGRAFÍA
       ========================================== */
    .content-section {
      page-break-after: always;
      padding-top: 5mm;
    }
    
    h1 {
      font-size: 16pt;
      font-weight: bold;
      color: #000000;
      margin-top: 0;
      margin-bottom: 6mm;
      border-bottom: 1px solid #222222;
      padding-bottom: 3mm;
    }
    
    h2 {
      font-size: 13pt;
      font-weight: bold;
      color: #111111;
      margin-top: 8mm;
      margin-bottom: 4mm;
      border-left: 4px solid #333333;
      padding-left: 8px;
    }
    
    p {
      margin-top: 0;
      margin-bottom: 5mm;
      text-align: justify;
      color: #333333;
      text-indent: 0; /* Opcional: Sangría de primera línea */
    }
    
    /* ==========================================
       5. COMPONENTES ESPECIALES
       ========================================== */
    /* Bloque simulador de terminal de consola */
    .console-box {
      background-color: #1a1a1a;
      color: #eaeaea;
      font-family: "Courier New", Courier, monospace;
      font-size: 8.5pt;
      padding: 12px 16px;
      border-radius: 6px;
      border: 1px solid #2d2d2d;
      margin-top: 4mm;
      margin-bottom: 6mm;
      white-space: pre-wrap;
      word-break: break-all;
      page-break-inside: avoid; /* Crucial para evitar roturas de página */
    }
    
    .console-prompt {
      color: #3df36c;
      font-weight: bold;
    }
    
    .console-command {
      color: #ffffff;
      font-weight: bold;
    }
    
    .console-output {
      color: #cccccc;
      display: block;
      margin-top: 4px;
    }
    
    /* Bloque de código de programación */
    .code-box {
      background-color: #f8f9fa;
      border: 1px solid #e2e8f0;
      color: #2d3748;
      font-family: "Courier New", Courier, monospace;
      font-size: 8.5pt;
      padding: 12px 16px;
      border-radius: 4px;
      margin-top: 4mm;
      margin-bottom: 6mm;
      white-space: pre;
      page-break-inside: avoid;
    }
  </style>
</head>
<body>

  <!-- ==========================================
     PORTADA ACADÉMICA
     ========================================== -->
  <div class="cover-page">
    <div class="cover-header">
      <div class="institution-name">Universidad o Centro de Estudios</div>
      <div class="department-name">Facultad de Informática / Grado en Ingeniería del Software</div>
    </div>
    
    <div class="cover-title-container">
      <div class="cover-title">Título de tu Trabajo de Fin de Grado</div>
      <div class="cover-subtitle">Subtítulo explicativo del proyecto, tecnologías utilizadas u objetivos principales</div>
    </div>
    
    <div class="cover-footer">
      <div class="metadata-grid">
        <div>
          <span class="metadata-label">Autor:</span><br>
          Nombre Completo del Alumno
        </div>
        <div>
          <span class="metadata-label">Fecha de Presentación:</span><br>
          Junio 2026
        </div>
      </div>
    </div>
  </div>

  <!-- ==========================================
     ÍNDICE DE CONTENIDOS
     ========================================== -->
  <div class="index-page">
    <div class="section-title">Índice de Secciones</div>
    <div class="index-list">
      <div class="index-item">
        <span class="index-name">1. Introducción y Objetivos</span>
        <span class="index-dots"></span>
        <span class="index-number">3</span>
      </div>
      <div class="index-item">
        <span class="index-name">2. Tecnologías y Arquitectura del Sistema</span>
        <span class="index-dots"></span>
        <span class="index-number">4</span>
      </div>
      <!-- Añadir aquí el resto de páginas del TFG -->
    </div>
  </div>

  <!-- ==========================================
     SECCIÓN 1: INTRODUCCIÓN
     ========================================== -->
  <div class="content-section">
    <h1>1. Introducción y Objetivos</h1>
    <p>
      Escribe aquí la introducción detallada de tu TFG. El diseño justificado garantiza que el documento tenga un acabado de libro de texto formal. Puedes utilizar subtítulos para estructurar los apartados lógicos del documento de manera elegante.
    </p>
    
    <h2>1.1. Objetivos del Proyecto</h2>
    <p>
      Estructura los objetivos principales de tu investigación.
    </p>

    <!-- Ejemplo de uso de bloques de comando o configuración si aplica -->
    <div class="console-box"><span class="console-prompt">admin@servidor-tfg:~$</span> <span class="console-command">systemctl status docker</span>
<span class="console-output">● docker.service - Docker Application Container Engine
   Active: active (running) since Tue 2026-05-19 19:10:00 CEST; 5min ago</span></div>
  </div>

</body>
</html>
```

---

## 3. Instrucciones de compilación para el agente

Cuando vayas a generar el documento, ejecuta el siguiente comando en la consola de tu entorno para generar el PDF a partir del archivo HTML resultante:

```bash
weasyprint "ruta/del/archivo_generado.html" "ruta/de_salida/documento_final.pdf"
```
