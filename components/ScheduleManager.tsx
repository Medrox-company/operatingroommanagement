[plugin:vite:react-babel] /vercel/share/v0-next-shadcn/components/ScheduleManager.tsx: 'return' outside of function. (412:4)
  415 |   const monthName = currentDate.toLocaleString('cs-CZ', { month: 'long', year: 'numeric' });
/vercel/share/v0-next-shadcn/components/ScheduleManager.tsx:412:4
410|  
411|  export default ScheduleManager;
412|      return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
   |      ^
413|    };
414|
    at constructor (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:365:19)
    at TypeScriptParserMixin.raise (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:6599:19)
    at TypeScriptParserMixin.parseReturnStatement (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:13136:12)
    at TypeScriptParserMixin.parseStatementContent (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:12798:21)
    at TypeScriptParserMixin.parseStatementContent (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:9508:18)
    at TypeScriptParserMixin.parseStatementLike (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:12767:17)
    at TypeScriptParserMixin.parseModuleItem (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:12744:17)
    at TypeScriptParserMixin.parseBlockOrModuleBlockBody (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:13316:36)
    at TypeScriptParserMixin.parseBlockBody (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:13309:10)
    at TypeScriptParserMixin.parseProgram (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:12622:10)
    at TypeScriptParserMixin.parseTopLevel (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:12612:25)
    at TypeScriptParserMixin.parse (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:14488:25)
    at TypeScriptParserMixin.parse (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:10126:18)
    at parse (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+parser@7.29.0/node_modules/@babel/parser/lib/index.js:14522:38)
    at parser (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+core@7.29.0/node_modules/@babel/core/lib/parser/index.js:41:34)
    at parser.next (<anonymous>)
    at normalizeFile (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+core@7.29.0/node_modules/@babel/core/lib/transformation/normalize-file.js:64:37)
    at normalizeFile.next (<anonymous>)
    at run (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+core@7.29.0/node_modules/@babel/core/lib/transformation/index.js:22:50)
    at run.next (<anonymous>)
    at transform (/vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+core@7.29.0/node_modules/@babel/core/lib/transform.js:22:33)
    at transform.next (<anonymous>)
    at step (/vercel/share/v0-next-shadcn/node_modules/.pnpm/gensync@1.0.0-beta.2/node_modules/gensync/index.js:261:32)
    at /vercel/share/v0-next-shadcn/node_modules/.pnpm/gensync@1.0.0-beta.2/node_modules/gensync/index.js:273:13
    at async.call.result.err.err (/vercel/share/v0-next-shadcn/node_modules/.pnpm/gensync@1.0.0-beta.2/node_modules/gensync/index.js:223:11)
    at /vercel/share/v0-next-shadcn/node_modules/.pnpm/gensync@1.0.0-beta.2/node_modules/gensync/index.js:189:28
    at /vercel/share/v0-next-shadcn/node_modules/.pnpm/@babel+core@7.29.0/node_modules/@babel/core/lib/gensync-utils/async.js:67:7
    at /vercel/share/v0-next-shadcn/node_modules/.pnpm/gensync@1.0.0-beta.2/node_modules/gensync/index.js:113:33
    at step (/vercel/share/v0-next-shadcn/node_modules/.pnpm/gensync@1.0.0-beta.2/node_modules/gensync/index.js:287:14)
    at /vercel/share/v0-next-shadcn/node_modules/.pnpm/gensync@1.0.0-beta.2/node_modules/gensync/index.js:273:13
    at async.call.result.err.err (/vercel/share/v0-next-shadcn/node_modules/.pnpm/gensync@1.0.0-beta.2/node_modules/gensync/index.js:223:11
Click outside, press Esc key, or fix the code to dismiss.
You can also disable this overlay by setting server.hmr.overlay to false in vite.config.ts.