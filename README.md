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

1. Escribe o pega el programa en **Código de Entrada**. También puedes cargar un archivo `.txt` o elegir uno de los ejemplos, incluidos **Booleanos, arreglos y control de flujo** y **Error Sintáctico**.
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

Las cadenas usan comillas dobles y admiten estas secuencias de escape JSON:

| Secuencia | Carácter que representa |
| --- | --- |
| `\"` | Comilla doble (`"`) dentro de la cadena |
| `\\` | Barra invertida (`\`) |
| `\/` | Barra diagonal (`/`); es válida aunque normalmente no hace falta escaparla |
| `\b` | Retroceso (backspace) |
| `\f` | Salto de página (form feed) |
| `\n` | Salto de línea |
| `\r` | Retorno de carro |
| `\t` | Tabulación |
| `\uXXXX` | Carácter Unicode indicado por cuatro dígitos hexadecimales; por ejemplo, `\u00F1` representa `ñ` |

El escape se escribe dentro del texto fuente y se convierte al carácter correspondiente al analizar la cadena. Por ejemplo:

```text
char mensaje = "Hola\n\t\"mundo\"\\";
Console.Log(mensaje);
```

La salida contiene `Hola`, un salto de línea, una tabulación, `"mundo"` y una barra invertida. Solo se aceptan los escapes de la tabla; por ejemplo, `\q` produce un error léxico.

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

### Arreglos

Los arreglos son de tamaño fijo y contienen un solo tipo de dato:

```text
int numeros[3] = [10, 20, 30];
numeros[1] = 25;
Console.Log(numeros[1]);
```

El tamaño puede inferirse de la lista inicial: `float medidas[] = [1.5, 2.5];`. Un arreglo declarado con tamaño y sin inicializador comienza con valores predeterminados para su tipo. Los índices empiezan en `0`; acceder fuera de sus límites produce un error de ejecución.
El tamaño máximo es de 10 000 elementos.

### Expresiones

Operadores disponibles:

- Aritméticos: `+`, `-`, `*`, `/`; también se admite el menos unario.
- Comparación: `<`, `<=`, `>`, `>=`, `==`, `!=`.
- Lógicos: `&&`, `||`, `!`.

`&&` y `||` requieren booleanos y evalúan con cortocircuito. Las comparaciones de orden aceptan números; `==` y `!=` aceptan valores del mismo tipo o una combinación de `int` y `float`. La precedencia, de mayor a menor, es: `!` y menos unario, `*` y `/`, `+` y `-`, comparación, igualdad, `&&` y `||`. Los paréntesis permiten agrupar expresiones.

### Control de flujo

Los bloques usan llaves. Se admiten `if`/`else`, `while` y `for`:

```text
bool continuar = true;
int suma = 0;

for (int i = 0; i < 3 && continuar; i = i + 1) {
  suma = suma + i;
  if (suma >= 3) {
    continuar = false;
  }
}

while (suma < 5) {
  suma = suma + 1;
}
```

Las condiciones deben ser de tipo `bool`. Para mantener la aplicación receptiva, la ejecución limita a 10 000 el total de iteraciones de bucle por análisis.

## Ejemplos breves

### Comparación y lógica

```text
bool mayor = 5 >= 3 && !false;
if (mayor) {
  Console.Log("sí");
}
```

### Bucle `while`

```text
int i = 0;
while (i < 3) {
  Console.Log(i);
  i = i + 1;
}
```

### Bucle `for`

```text
int suma = 0;
for (int i = 1; i <= 3; i = i + 1) {
  suma = suma + i;
}
Console.Log(suma);
```

### Arreglo

```text
int datos[] = [4, 8];
Console.Log(datos[1]);
```

### Error sintáctico

```text
int edad
Console.Log(edad);
```

Falta `;` después de la declaración `int edad`. El analizador indicará el error sintáctico y su ubicación.

## Fases del análisis

1. **Análisis léxico:** convierte el texto en tokens e informa de caracteres no reconocidos.
2. **Análisis sintáctico:** comprueba declaraciones, asignaciones, impresiones y expresiones; genera el árbol sintáctico.
3. **Análisis semántico:** registra variables, valida declaraciones y tipos, evalúa expresiones y reúne los resultados de impresión.

El analizador semántico permite asignar un entero a una variable `float`. Al asignar un decimal a `int` (incluyendo inicializaciones y elementos de arreglos), trunca la parte fraccionaria hacia cero. No permite usar cadenas o booleanos en operaciones aritméticas.

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

El lenguaje no incluye funciones, `break`/`continue`, arreglos multidimensionales ni alcance local por bloque. Los arreglos tienen tamaño fijo y el bucle `for` usa una asignación como actualización (por ejemplo, `i = i + 1`); no se admiten operadores de incremento como `i++`.
