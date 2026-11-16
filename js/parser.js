// js/parser.js

export function syntacticAnalyzer(tokens) {
  let current = 0;
  const errors = [];
  const statementStarts = new Set([
    "TYPE",
    "PRINT",
    "ID",
    "IF",
    "WHILE",
    "FOR",
    "LBRACE",
  ]);

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
    return !isAtEnd() && peek().type === type;
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
    const column = token ? token.column : 1;
    throw {
      phase: "Sintáctico",
      message: `${errorMessage} (se encontró '${peek()?.lexeme || "fin de archivo"}') en línea ${line}, columna ${column}`,
      line,
      column,
    };
  }

  function synchronize(inBlock, start) {
    if (current === start && !isAtEnd() && !(inBlock && check("RBRACE"))) {
      advance();
    }

    while (!isAtEnd()) {
      if (previous()?.type === "SEMICOLON") return;
      if (inBlock && check("RBRACE")) return;
      if (statementStarts.has(peek().type)) return;
      advance();
    }
  }

  function parseProgram() {
    const body = [];
    while (!isAtEnd()) {
      const start = current;
      try {
        body.push(parseStatement());
      } catch (error) {
        errors.push(error);
        synchronize(false, start);
      }
    }
    return { type: "Program", body };
  }

  function parseStatement() {
    if (match("TYPE")) return parseDeclaration();
    if (match("PRINT")) return parsePrintStatement();
    if (match("IF")) return parseIfStatement();
    if (match("WHILE")) return parseWhileStatement();
    if (match("FOR")) return parseForStatement();
    if (match("LBRACE")) return parseBlockStatement();
    if (check("ID")) return parseAssignment();

    const token = peek() || previous();
    const line = token ? token.line : 1;
    const column = token ? token.column : 1;
    throw {
      phase: "Sintáctico",
      message: `Instrucción no válida '${token ? token.lexeme : "fin de archivo"}' en línea ${line}, columna ${column}`,
      line,
      column,
    };
  }

  function parseDeclaration(consumeSemicolon = true) {
    const typeToken = previous();
    const declarations = [];

    do {
      const idToken = consume(
        "ID",
        "Se esperaba un nombre de variable después del tipo o coma",
      );
      let isArray = false;
      let arraySize = null;
      if (match("LBRACKET")) {
        isArray = true;
        if (!check("RBRACKET")) arraySize = parseExpression();
        consume("RBRACKET", "Falta cerrar el tamaño del arreglo con ']'");
      }

      let init = null;
      if (match("EQUAL")) init = parseExpression();

      declarations.push({
        id: idToken.lexeme,
        line: idToken.line,
        init,
        isArray,
        arraySize,
      });
    } while (match("COMMA"));

    if (consumeSemicolon) {
      consume("SEMICOLON", "Falta ';' al final de la declaración");
    }

    return {
      type: "VariableDeclaration",
      dataType: typeToken.lexeme,
      declarations,
      line: typeToken.line,
    };
  }

  function parseAssignment(consumeSemicolon = true) {
    const idToken = consume("ID", "Se esperaba un identificador");
    let index = null;
    if (match("LBRACKET")) {
      index = parseExpression();
      consume("RBRACKET", "Falta cerrar el índice del arreglo con ']'");
    }
    consume("EQUAL", "Se esperaba '=' en la asignación");
    const value = parseExpression();

    if (consumeSemicolon) {
      consume("SEMICOLON", "Falta ';' al final de la asignación");
    }

    if (index) {
      return {
        type: "ArrayAssignment",
        id: idToken.lexeme,
        index,
        value,
        line: idToken.line,
      };
    }

    return {
      type: "AssignmentExpression",
      id: idToken.lexeme,
      value,
      line: idToken.line,
    };
  }

  function parsePrintStatement() {
    const printToken = previous();
    consume("LPAREN", "Se esperaba '(' después de la instrucción de impresión");
    const expression = parseExpression();
    consume("RPAREN", "Se esperaba ')' después de la expresión");
    consume("SEMICOLON", "Falta ';' al final de la instrucción de impresión");

    return {
      type: "PrintStatement",
      expression,
      line: printToken.line,
    };
  }

  function parseBlockStatement() {
    const openBrace = previous();
    const body = [];

    while (!isAtEnd() && !check("RBRACE")) {
      const start = current;
      try {
        body.push(parseStatement());
      } catch (error) {
        errors.push(error);
        synchronize(true, start);
      }
    }

    consume("RBRACE", "Falta cerrar el bloque con '}'");
    return { type: "BlockStatement", body, line: openBrace.line };
  }

  function parseIfStatement() {
    const token = previous();
    consume("LPAREN", "Se esperaba '(' después de if");
    const condition = parseExpression();
    consume("RPAREN", "Se esperaba ')' después de la condición de if");
    const consequent = parseStatement();
    const alternate = match("ELSE") ? parseStatement() : null;

    return {
      type: "IfStatement",
      condition,
      consequent,
      alternate,
      line: token.line,
    };
  }

  function parseWhileStatement() {
    const token = previous();
    consume("LPAREN", "Se esperaba '(' después de while");
    const condition = parseExpression();
    consume("RPAREN", "Se esperaba ')' después de la condición de while");
    const body = parseStatement();

    return {
      type: "WhileStatement",
      condition,
      body,
      line: token.line,
    };
  }

  function parseForStatement() {
    const token = previous();
    consume("LPAREN", "Se esperaba '(' después de for");

    let initializer = null;
    if (match("SEMICOLON")) {
      initializer = null;
    } else if (match("TYPE")) {
      initializer = parseDeclaration(false);
      consume("SEMICOLON", "Falta ';' después del inicio de for");
    } else {
      initializer = parseAssignment(false);
      consume("SEMICOLON", "Falta ';' después del inicio de for");
    }

    const condition = check("SEMICOLON") ? null : parseExpression();
    consume("SEMICOLON", "Falta ';' después de la condición de for");

    const update = check("RPAREN") ? null : parseAssignment(false);
    consume("RPAREN", "Se esperaba ')' al final de la cabecera de for");
    const body = parseStatement();

    return {
      type: "ForStatement",
      initializer,
      condition,
      update,
      body,
      line: token.line,
    };
  }

  function parseExpression() {
    return parseLogicalOr();
  }

  function parseLogicalOr() {
    return parseBinaryLevel(parseLogicalAnd, { OR: "||" });
  }

  function parseLogicalAnd() {
    return parseBinaryLevel(parseEquality, { AND: "&&" });
  }

  function parseEquality() {
    return parseBinaryLevel(parseComparison, {
      EQUAL_EQUAL: "==",
      NOT_EQUAL: "!=",
    });
  }

  function parseComparison() {
    return parseBinaryLevel(parseAdditive, {
      LESS: "<",
      LESS_EQUAL: "<=",
      GREATER: ">",
      GREATER_EQUAL: ">=",
    });
  }

  function parseAdditive() {
    return parseBinaryLevel(parseTerm, { PLUS: "+", MINUS: "-" });
  }

  function parseTerm() {
    return parseBinaryLevel(parseUnary, { TIMES: "*", DIVIDE: "/" });
  }

  function parseBinaryLevel(nextParser, operators) {
    let left = nextParser();

    while (!isAtEnd() && operators[peek().type]) {
      const operator = advance().lexeme;
      const right = nextParser();
      left = { type: "BinaryExpression", operator, left, right };
    }

    return left;
  }

  function parseUnary() {
    if (match("NOT", "MINUS")) {
      const operator = previous().lexeme;
      return {
        type: "UnaryExpression",
        operator,
        operand: parseUnary(),
      };
    }
    return parseFactor();
  }

  function parseFactor() {
    if (match("NUMBER")) {
      return { type: "Literal", dataType: "int", value: previous().value };
    }
    if (match("FLOAT_NUM")) {
      return { type: "Literal", dataType: "float", value: previous().value };
    }
    if (match("STRING")) {
      return { type: "Literal", dataType: "char", value: previous().value };
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
      if (match("LBRACKET")) {
        const index = parseExpression();
        consume("RBRACKET", "Falta cerrar el índice del arreglo con ']'");
        return { type: "ArrayAccess", name: token.lexeme, index, line: token.line };
      }
      return { type: "Identifier", name: token.lexeme, line: token.line };
    }
    if (match("LBRACKET")) {
      const elements = [];
      if (!check("RBRACKET")) {
        do {
          elements.push(parseExpression());
        } while (match("COMMA"));
      }
      consume("RBRACKET", "Falta cerrar el arreglo con ']'");
      return { type: "ArrayLiteral", elements };
    }
    if (match("LPAREN")) {
      const expression = parseExpression();
      consume("RPAREN", "Falta cerrar paréntesis ')'");
      return expression;
    }

    const token = peek() || previous();
    const line = token ? token.line : 1;
    const column = token ? token.column : 1;
    throw {
      phase: "Sintáctico",
      message: `Expresión inesperada '${token ? token.lexeme : "fin de archivo"}' en línea ${line}, columna ${column}`,
      line,
      column,
    };
  }

  const ast = parseProgram();
  return { ast, errors };
}
