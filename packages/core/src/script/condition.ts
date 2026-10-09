/**
 * 条件表达式求值器。
 * 不使用 eval —— 手写词法分析 + 递归下降，可安全执行外部剧本。
 *
 * 支持：数字、字符串、布尔、标识符变量
 *       比较 == != > >= < <=
 *       逻辑 && || !
 *       括号分组
 */

export type VarValue = number | boolean | string;
export type Vars = Record<string, VarValue>;

type TokenType = "num" | "str" | "ident" | "op" | "lparen" | "rparen" | "eof";
interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

const OP_RE = /^(>=|<=|==|!=|&&|\|\||[<>!])/;
const NUM_RE = /^-?\d+(?:\.\d+)?/;
const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_.]*/;

export function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }

    const rest = src.slice(i);

    if (c === "(") { out.push({ type: "lparen", value: "(", pos: i }); i++; continue; }
    if (c === ")") { out.push({ type: "rparen", value: ")", pos: i }); i++; continue; }

    if (c === '"' || c === "'") {
      const quote = c;
      let j = i + 1;
      let buf = "";
      while (j < src.length && src[j] !== quote) {
        if (src[j] === "\\" && j + 1 < src.length) { buf += src[j + 1]; j += 2; }
        else { buf += src[j]; j++; }
      }
      if (j >= src.length) throw new Error(`未闭合的字符串，位置 ${i}`);
      out.push({ type: "str", value: buf, pos: i });
      i = j + 1;
      continue;
    }

    const op = rest.match(OP_RE);
    if (op) { out.push({ type: "op", value: op[1], pos: i }); i += op[1].length; continue; }

    const num = rest.match(NUM_RE);
    if (num) { out.push({ type: "num", value: num[0], pos: i }); i += num[0].length; continue; }

    const ident = rest.match(IDENT_RE);
    if (ident) { out.push({ type: "ident", value: ident[0], pos: i }); i += ident[0].length; continue; }

    throw new Error(`无法识别的字符 '${c}'，位置 ${i}`);
  }
  out.push({ type: "eof", value: "", pos: src.length });
  return out;
}

class Parser {
  private toks: Token[];
  private i = 0;
  private vars: Vars;

  constructor(toks: Token[], vars: Vars) {
    this.toks = toks;
    this.vars = vars;
  }

  private peek(): Token { return this.toks[this.i]; }
  private next(): Token { return this.toks[this.i++]; }

  private eatOp(...ops: string[]): boolean {
    const t = this.peek();
    if (t.type === "op" && ops.includes(t.value)) { this.i++; return true; }
    return false;
  }

  parse(): VarValue {
    const v = this.parseOr();
    if (this.peek().type !== "eof") {
      throw new Error(`表达式尾部有多余内容：'${this.peek().value}'`);
    }
    return v;
  }

  private parseOr(): VarValue {
    let left = this.parseAnd();
    while (this.eatOp("||")) {
      const right = this.parseAnd();
      left = truthy(left) || truthy(right);
    }
    return left;
  }

  private parseAnd(): VarValue {
    let left = this.parseNot();
    while (this.eatOp("&&")) {
      const right = this.parseNot();
      left = truthy(left) && truthy(right);
    }
    return left;
  }

  private parseNot(): VarValue {
    if (this.eatOp("!")) return !truthy(this.parseNot());
    return this.parseCompare();
  }

  private parseCompare(): VarValue {
    const left = this.parsePrimary();
    const t = this.peek();
    if (t.type === "op" && ["==", "!=", ">", ">=", "<", "<="].includes(t.value)) {
      this.i++;
      const right = this.parsePrimary();
      return compare(left, right, t.value);
    }
    return left;
  }

  private parsePrimary(): VarValue {
    const t = this.next();
    switch (t.type) {
      case "num": return Number(t.value);
      case "str": return t.value;
      case "ident": {
        if (t.value === "true") return true;
        if (t.value === "false") return false;
        if (t.value === "null") return false;
        const v = this.vars[t.value];
        if (v === undefined) return false; // 未定义变量视为 false，不抛错
        return v;
      }
      case "lparen": {
        const v = this.parseOr();
        const close = this.next();
        if (close.type !== "rparen") throw new Error("缺少右括号");
        return v;
      }
      default:
        throw new Error(`意外的记号 '${t.value}'`);
    }
  }
}

export function truthy(v: VarValue): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  return v.length > 0;
}

function num(v: VarValue): number | null {
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function compare(a: VarValue, b: VarValue, op: string): boolean {
  if (op === "==") return looseEq(a, b);
  if (op === "!=") return !looseEq(a, b);

  const na = num(a);
  const nb = num(b);
  if (na === null || nb === null) {
    // 非数值回退到字符串比较
    const sa = String(a);
    const sb = String(b);
    if (op === ">") return sa > sb;
    if (op === ">=") return sa >= sb;
    if (op === "<") return sa < sb;
    if (op === "<=") return sa <= sb;
    return false;
  }
  if (op === ">") return na > nb;
  if (op === ">=") return na >= nb;
  if (op === "<") return na < nb;
  if (op === "<=") return na <= nb;
  return false;
}

function looseEq(a: VarValue, b: VarValue): boolean {
  if (typeof a === typeof b) return a === b;
  const na = num(a);
  const nb = num(b);
  if (na !== null && nb !== null) return na === nb;
  return String(a) === String(b);
}

/** 求值入口。表达式为空视为 true。 */
export function evaluate(expr: string, vars: Vars = {}): boolean {
  const src = expr.trim();
  if (src === "") return true;
  return truthy(new Parser(tokenize(src), vars).parse());
}
