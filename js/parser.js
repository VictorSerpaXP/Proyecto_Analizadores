// js/parser.js

export function syntacticAnalyzer(tokens) {
  let current = 0;
  const errors = [];

  // Funciones auxiliares para navegar los tokens
  function peek() {
    return tokens[current];
  }

  function previous() {
    return tokens[current - 1];
  }

  function isAtEnd() {
    return current >= tokens.length;
  }

  function advance() {
    if (!isAtEnd()) current++;
    return previous();
  }

  function check(type) {
    if (isAtEnd()) return false;
    return peek().type === type;
  }

  function match(...types) {
    for (const type of types) {
      if (check(type)) {
        advance();
        return true;
      }
    }
    return false;
  }

  function consume(type, errorMessage) {
    if (check(type)) return advance();
    const token = peek() || previous();
    const line = token ? token.line : 1;
    const col = token ? token.column : 1;
    throw {
      phase: "Sintáctico",
      message: `${errorMessage} (se encontró '${token ? token.lexeme : "fin de archivo"}') en línea ${line}, columna ${col}`,
      line,
      column: col,
    };
  }

  // --- REGLAS GRAMATICALES ---

  // Programa -> Lista de sentencias
  function parseProgram() {
    const body = [];
    while (!isAtEnd()) {
      try {
        body.push(parseStatement());
      } catch (err) {
        errors.push(err);
        // Recuperación de error: avanzar hasta el próximo ';'
        while (!isAtEnd() && previous()?.type !== "SEMICOLON") {
          advance();
        }
      }
    }
    return { type: "Program", body };
  }

  // Sentencia -> Declaración | Asignación | Impresión
  function parseStatement() {
    if (match("TYPE")) {
      return parseDeclaration();
    }
    if (match("PRINT")) {
      return parsePrintStatement();
    }
    if (check("ID")) {
      return parseAssignment();
    }

    const token = peek();
    throw {
      phase: "Sintáctico",
      message: `Instrucción no válida '${token.lexeme}' en línea ${token.line}, columna ${token.column}`,
      line: token.line,
      column: token.column,
    };
  }

  // Declaración -> TYPE ID (, ID)* ;   (Ej: float x, y;)
  function parseDeclaration() {
    const typeToken = previous();
    const declarations = [];

    do {
      const idToken = consume(
        "ID",
        "Se esperaba un nombre de variable después del tipo o coma",
      );
      let initValue = null;

      // Soporte opcional para inicialización directa (ej. int x = 5;)
      if (match("EQUAL")) {
        initValue = parseExpression();
      }

      declarations.push({
        id: idToken.lexeme,
        line: idToken.line,
        init: initValue,
      });
    } while (match("COMMA"));

    consume("SEMICOLON", "Falta ';' al final de la declaración");

    return {
      type: "VariableDeclaration",
      dataType: typeToken.lexeme,
      declarations,
      line: typeToken.line,
    };
  }

  // Asignación -> ID = Expresión ;   (Ej: x = (1 + 5) * 20 / 5;)
  function parseAssignment() {
    const idToken = consume("ID", "Se esperaba un identificador");
    consume("EQUAL", "Se esperaba '=' en la asignación");
    const value = parseExpression();
    consume("SEMICOLON", "Falta ';' al final de la asignación");

    return {
      type: "AssignmentExpression",
      id: idToken.lexeme,
      value,
      line: idToken.line,
    };
  }

  // Impresión -> Console.Log ( Expresión ) ;
  function parsePrintStatement() {
    const printToken = previous();
    consume("LPAREN", "Se esperaba '(' después de Console.Log");
    const expression = parseExpression();
    consume("RPAREN", "Se esperaba ')' después de la expresión");
    consume("SEMICOLON", "Falta ';' al final de Console.Log");

    return {
      type: "PrintStatement",
      expression,
      line: printToken.line,
    };
  }

  // Expresión -> Término ((+ | -) Término)*
  function parseExpression() {
    let left = parseTerm();

    while (match("PLUS", "MINUS")) {
      const operator = previous().lexeme;
      const right = parseTerm();
      left = {
        type: "BinaryExpression",
        operator,
        left,
        right,
      };
    }

    return left;
  }

  // Término -> Factor ((* | /) Factor)*  (Respeta precedencia de * y / sobre + y -)
  function parseTerm() {
    let left = parseFactor();

    while (match("TIMES", "DIVIDE")) {
      const operator = previous().lexeme;
      const right = parseFactor();
      left = {
        type: "BinaryExpression",
        operator,
        left,
        right,
      };
    }

    return left;
  }

  // Factor -> NUMBER | FLOAT_NUM | STRING | BOOL_VAL | ID | ( Expresión )
  function parseFactor() {
    if (match("NUMBER")) {
      return { type: "Literal", dataType: "int", value: previous().value };
    }
    if (match("FLOAT_NUM")) {
      return { type: "Literal", dataType: "float", value: previous().value };
    }
    if (match("STRING")) {
      return {
        type: "Literal",
        dataType: "char",
        value: previous().value.slice(1, -1),
      };
    }
    if (match("BOOL_VAL")) {
      return {
        type: "Literal",
        dataType: "bool",
        value: previous().value === "true",
      };
    }
    if (match("ID")) {
      const token = previous();
      return { type: "Identifier", name: token.lexeme, line: token.line };
    }
    if (match("LPAREN")) {
      const expr = parseExpression();
      consume("RPAREN", "Falta cerrar paréntesis ')'");
      return expr;
    }

    const token = peek() || previous();
    throw {
      phase: "Sintáctico",
      message: `Expresión inesperada '${token ? token.lexeme : ""}' en línea ${token ? token.line : 1}`,
      line: token ? token.line : 1,
      column: token ? token.column : 1,
    };
  }

  const ast = parseProgram();
  return { ast, errors };
}
