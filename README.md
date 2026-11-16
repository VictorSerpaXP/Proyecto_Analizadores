# Analizador léxico, sintáctico y semántico

Aplicación web educativa que analiza y ejecuta programas pequeños escritos en un lenguaje inspirado en C. Muestra los tokens, el árbol sintáctico, la tabla de símbolos y los mensajes o resultados de la ejecución.

## Requisitos

- Un navegador web moderno.
- Python 3 para iniciar el servidor local, o una extensión equivalente como Live Server en Visual Studio Code.

No se necesitan dependencias ni un proceso de compilación.

## Cómo ejecutar

Desde la carpeta raíz del proyecto, inicia un servidor local:

```bash
python3 -m http.server 8000
```

Abre [http://localhost:8000](http://localhost:8000) en el navegador. Para detener el servidor, usa `Ctrl+C` en la terminal.

También puedes abrir la carpeta con Visual Studio Code e iniciar `index.html` con Live Server.

## Cómo usar

1. Escribe o pega el programa en **Código de Entrada**. También puedes cargar un archivo `.txt` o elegir uno de los ejemplos.
2. Presiona **Analizar Código**.
3. Explora las pestañas:
   - **Tokens (Léxico):** tokens reconocidos y sus posiciones.
   - **Árbol Sintáctico:** estructura del programa y sus expresiones; puedes plegar o desplegar sus ramas.
   - **Tabla de Símbolos:** variables, tipos, valores, líneas de declaración y referencias.
4. Revisa **Mensajes y Errores** y **Resultado del Código** en el panel inferior.
5. Presiona **Limpiar** para borrar el programa y sus resultados.

## Sintaxis admitida

### Tipos y valores

Tipos disponibles: `int`, `float`, `char` y `bool`.

- Enteros: `25`
- Decimales: `3.14`
- Cadenas entre comillas dobles: `"Hola"`
- Booleanos: `true` y `false`
- Identificadores: comienzan con una letra o `_`; después pueden contener letras, números y `_`.

### Sentencias

```text
int edad;
float promedio = 8.5;
char saludo = "Hola";
bool activo = true;

edad = (18 + 2) * 3;
Console.Log(edad);
print(promedio);
```

Se admiten declaraciones con varias variables, asignaciones y llamadas de impresión con `Console.Log(...)` o `print(...)`. Las sentencias terminan con `;`.

### Expresiones

Se admiten los operadores aritméticos `+`, `-`, `*` y `/`, además de paréntesis. La multiplicación y la división tienen precedencia sobre la suma y la resta; los paréntesis permiten agrupar expresiones.

## Fases del análisis

1. **Análisis léxico:** convierte el texto en tokens e informa de caracteres no reconocidos.
2. **Análisis sintáctico:** comprueba declaraciones, asignaciones, impresiones y expresiones; genera el árbol sintáctico.
3. **Análisis semántico:** registra variables, valida declaraciones y tipos, evalúa expresiones y reúne los resultados de impresión.

El analizador semántico permite asignar un entero a una variable `float` y convertir un decimal a `int` truncando su parte fraccionaria. No permite usar cadenas o booleanos en operaciones aritméticas.

## Estructura del proyecto

```text
.
├── index.html           # Interfaz de la aplicación
├── css/
│   └── styles.css       # Estilos
└── js/
    ├── main.js          # Interfaz y coordinación de las fases
    ├── lexer.js         # Análisis léxico
    ├── parser.js        # Análisis sintáctico y construcción del AST
    ├── semantic.js      # Validación semántica y evaluación
    └── symbolTable.js   # Tabla de símbolos
```

## Limitaciones

El lenguaje implementado se enfoca en declaraciones, asignaciones, impresión y expresiones aritméticas. No incluye estructuras de control, funciones, operadores de comparación o lógicos, ni secuencias de escape en cadenas.
