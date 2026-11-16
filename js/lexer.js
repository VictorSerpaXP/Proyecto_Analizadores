// js/lexer.js

export function lexicalAnalyzer(input) {
  const tokens = [];
  const errors = [];

  // Palabras reservadas (tipos de datos y valores booleanos)
  const keywords = new Set(["int", "float", "char", "bool", "true", "false"]);

  // Definición de reglas con Expresiones Regulares
  const tokenSpecs = [
    { type: "NEWLINE", regex: /^\n/ },
    { type: "SKIP", regex: /^[ \t\r]+/ },
    { type: "PRINT", regex: /^(Console\.Log|print)\b/ }, // Instrucción de impresión
    { type: "FLOAT_NUM", regex: /^\d+\.\d+/ }, // Números decimales
    { type: "NUMBER", regex: /^\d+/ }, // Números enteros
    { type: "ID", regex: /^[a-zA-Z_]\w*/ }, // Identificadores
    { type: "PLUS", regex: /^\+/ }, // +
    { type: "MINUS", regex: /^-/ }, // -
    { type: "TIMES", regex: /^\*/ }, // *
    { type: "DIVIDE", regex: /^\// }, // /
    { type: "EQUAL", regex: /^=/ }, // =
    { type: "LPAREN", regex: /^\(/ }, // (
    { type: "RPAREN", regex: /^\)/ }, // )
    { type: "SEMICOLON", regex: /^;/ }, // ;
    { type: "COMMA", regex: /^,/ }, // ,
    { type: "STRING", regex: /^"[^"]*"/ }, // Cadenas de texto
  ];

  let cursor = 0;
  let line = 1;
  let column = 1;

  while (cursor < input.length) {
    const remainingText = input.slice(cursor);
    let matched = false;

    for (const spec of tokenSpecs) {
      const match = remainingText.match(spec.regex);

      if (match) {
        const lexeme = match[0];
        matched = true;

        if (spec.type === "NEWLINE") {
          line++;
          column = 1;
        } else if (spec.type === "SKIP") {
          column += lexeme.length;
        } else {
          let tokenType = spec.type;
          let value = lexeme;

          if (tokenType === "ID" && keywords.has(lexeme)) {
            if (lexeme === "true" || lexeme === "false") {
              tokenType = "BOOL_VAL";
            } else {
              tokenType = "TYPE";
            }
          }

          if (tokenType === "NUMBER") value = parseInt(lexeme, 10);
          if (tokenType === "FLOAT_NUM") value = parseFloat(lexeme);

          tokens.push({
            type: tokenType,
            lexeme: lexeme,
            value: value,
            line: line,
            column: column,
          });

          column += lexeme.length;
        }

        cursor += lexeme.length;
        break;
      }
    }

    if (!matched) {
      const illegalChar = input[cursor];
      errors.push({
        phase: "Léxico",
        message: `Carácter ilegal '${illegalChar}' en línea ${line}, columna ${column}`,
        line: line,
        column: column,
      });
      cursor++;
      column++;
    }
  }

  return { tokens, errors };
}
