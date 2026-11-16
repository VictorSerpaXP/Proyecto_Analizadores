// js/lexer.js

export function lexicalAnalyzer(input) {
  const tokens = [];
  const errors = [];

  const keywords = new Set([
    "int",
    "float",
    "char",
    "bool",
    "true",
    "false",
    "if",
    "else",
    "while",
    "for",
  ]);
  const controlKeywords = {
    if: "IF",
    else: "ELSE",
    while: "WHILE",
    for: "FOR",
  };

  const tokenSpecs = [
    { type: "NEWLINE", regex: /^\n/ },
    { type: "SKIP", regex: /^[ \t\r]+/ },
    { type: "PRINT", regex: /^(Console\.Log|print)\b/ },
    { type: "FLOAT_NUM", regex: /^\d+\.\d+/ },
    { type: "NUMBER", regex: /^\d+/ },
    { type: "ID", regex: /^[a-zA-Z_]\w*/ },
    { type: "AND", regex: /^&&/ },
    { type: "OR", regex: /^\|\|/ },
    { type: "EQUAL_EQUAL", regex: /^==/ },
    { type: "NOT_EQUAL", regex: /^!=/ },
    { type: "LESS_EQUAL", regex: /^<=/ },
    { type: "GREATER_EQUAL", regex: /^>=/ },
    { type: "PLUS", regex: /^\+/ },
    { type: "MINUS", regex: /^-/ },
    { type: "TIMES", regex: /^\*/ },
    { type: "DIVIDE", regex: /^\// },
    { type: "LESS", regex: /^</ },
    { type: "GREATER", regex: /^>/ },
    { type: "EQUAL", regex: /^=/ },
    { type: "NOT", regex: /^!/ },
    { type: "LPAREN", regex: /^\(/ },
    { type: "RPAREN", regex: /^\)/ },
    { type: "LBRACKET", regex: /^\[/ },
    { type: "RBRACKET", regex: /^\]/ },
    { type: "LBRACE", regex: /^\{/ },
    { type: "RBRACE", regex: /^\}/ },
    { type: "SEMICOLON", regex: /^;/ },
    { type: "COMMA", regex: /^,/ },
  ];

  let cursor = 0;
  let line = 1;
  let column = 1;

  while (cursor < input.length) {
    const remainingText = input.slice(cursor);

    if (remainingText[0] === '"') {
      const stringMatch = remainingText.match(
        /^"(?:[^"\\\x00-\x1F]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"/,
      );

      if (stringMatch) {
        const lexeme = stringMatch[0];
        tokens.push({
          type: "STRING",
          lexeme,
          value: JSON.parse(lexeme),
          line,
          column,
        });
        cursor += lexeme.length;
        column += lexeme.length;
        continue;
      }

      errors.push({
        phase: "Léxico",
        message: `Cadena sin cerrar o secuencia de escape inválida en línea ${line}, columna ${column}`,
        line,
        column,
      });

      let consumed = 1;
      let escaped = false;
      while (cursor + consumed < input.length) {
        const character = input[cursor + consumed];
        if (character === "\n" || character === "\r") break;
        consumed++;
        if (escaped) {
          escaped = false;
        } else if (character === "\\") {
          escaped = true;
        } else if (character === '"') {
          break;
        }
      }
      cursor += consumed;
      column += consumed;
      continue;
    }

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
            } else if (controlKeywords[lexeme]) {
              tokenType = controlKeywords[lexeme];
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
