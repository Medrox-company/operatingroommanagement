[plugin:vite:react-babel] /vercel/share/v0-next-shadcn/components/StatisticsModule.tsx: Unexpected token (880:2)
  883 |   const utilData = period === 'den' ? dayData : period === 'týden' ? weekData : monthData;
/vercel/share/v0-next-shadcn/components/StatisticsModule.tsx:880:2
878|  // ── Main component ────────────────────────────────────────────────────────────
879|  const StatisticsModule: React.FC<StatisticsModuleProps> = ({ rooms = MOCK_ROOMS }) => {
880|    const [period, setPeriod] = useState<Period>('týden');
   |    ^
881|    const [selectedRoom, setSelectedRoom] = useState<OperatingRoom | null>(null);
882|
    at constructor (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:365:19)
    at TypeScriptParserMixin.raise (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:6599:19)
    at TypeScriptParserMixin.unexpected (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:6619:16)
    at TypeScriptParserMixin.parseExprAtom (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:11442:22)
    at TypeScriptParserMixin.parseExprAtom (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:4764:20)
    at TypeScriptParserMixin.parseExprSubscripts (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:11081:23)
    at TypeScriptParserMixin.parseUpdate (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:11066:21)
    at TypeScriptParserMixin.parseMaybeUnary (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:11046:23)
    at TypeScriptParserMixin.parseMaybeUnary (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:9837:18)
    at TypeScriptParserMixin.parseMaybeUnaryOrPrivate (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:10899:61)
    at TypeScriptParserMixin.parseExprOps (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:10904:23)
    at TypeScriptParserMixin.parseMaybeConditional (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:10881:23)
    at TypeScriptParserMixin.parseMaybeAssign (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:10831:21)
    at TypeScriptParserMixin.parseMaybeAssign (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:9786:20)
    at TypeScriptParserMixin.parseExpressionBase (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:10784:23)
    at /vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:10780:39
    at TypeScriptParserMixin.allowInAnd (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:12426:12)
    at TypeScriptParserMixin.parseExpression (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:10780:17)
    at TypeScriptParserMixin.jsxParseExpressionContainer (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:4632:31)
    at TypeScriptParserMixin.jsxParseElementAt (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:4711:36)
    at TypeScriptParserMixin.jsxParseElementAt (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:4698:32)
    at TypeScriptParserMixin.jsxParseElementAt (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:4698:32)
    at TypeScriptParserMixin.jsxParseElement (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:4749:17)
    at TypeScriptParserMixin.parseExprAtom (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:4759:19)
    at TypeScriptParserMixin.parseExprSubscripts (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:11081:23)
    at TypeScriptParserMixin.parseUpdate (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:11066:21)
    at TypeScriptParserMixin.parseMaybeUnary (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:11046:23)
    at TypeScriptParserMixin.parseMaybeUnary (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:9837:18)
    at TypeScriptParserMixin.parseMaybeUnaryOrPrivate (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:10899:61)
    at TypeScriptParserMixin.parseExprOps (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:10904:23)
    at TypeScriptParserMixin.parseMaybeConditional (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:10881:23)
    at TypeScriptParserMixin.parseMaybeAssign (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:10831:21)
    at /vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:9775:39
    at TypeScriptParserMixin.tryParse (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:6907:20)
    at TypeScriptParserMixin.parseMaybeAssign (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:9775:18)
    at /vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:10800:39
    at TypeScriptParserMixin.allowInAnd (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:12426:12)
    at TypeScriptParserMixin.parseMaybeAssignAllowIn (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:10800:17)
    at TypeScriptParserMixin.parseMaybeAssignAllowInOrVoidPattern (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:12493:17)
    at TypeScriptParserMixin.parseParenAndDistinguishExpression (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:11675:28)
    at TypeScriptParserMixin.parseExprAtom (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:11331:23)
    at TypeScriptParserMixin.parseExprAtom (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:4764:20)
    at TypeScriptParserMixin.parseExprSubscripts (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:11081:23)
    at TypeScriptParserMixin.parseUpdate (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:11066:21)
    at TypeScriptParserMixin.parseMaybeUnary (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:11046:23)
    at TypeScriptParserMixin.parseMaybeUnary (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:9837:18)
    at TypeScriptParserMixin.parseMaybeUnaryOrPrivate (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:10899:61)
    at TypeScriptParserMixin.parseExprOps (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:10904:23)
    at TypeScriptParserMixin.parseMaybeConditional (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:10881:23)
    at TypeScriptParserMixin.parseMaybeAssign (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:10831:21
Click outside, press Esc key, or fix the code to dismiss.
You can also disable this overlay by setting server.hmr.overlay to false in vite.config.ts.