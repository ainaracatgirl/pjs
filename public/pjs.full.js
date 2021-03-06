let GlobalRenderIndexer = Math.floor(Math.random() * 10000);

function getMeta(metaName) {
    const metas = document.getElementsByTagName('meta');
  
    for (let i = 0; i < metas.length; i++) {
      if (metas[i].getAttribute('name') === metaName) {
        return metas[i].getAttribute('content');
      }
    }
  
    return '';
}

function ProcessGlobalRender() {
    document.getElementById('root').innerHTML = AppBasic.App({
        href: location.href,
        path: location.path
    });
    
    function extractAttr(attr) {
        const out = {};
    
        for (const att of attr) {
            out[att.name] = att.value;
        }
    
        return out;
    }

    const _AppBasic = {};
    _AppBasic.URLRouter = function({}, tag) {
        if (ProcessGlobalRender.router) {
            return ProcessGlobalRender.routerContent;
        }
        ProcessGlobalRender.router = tag;
        ProcessGlobalRender.routerContent = tag.innerHTML + "";
        return tag.innerHTML;
    }
    _AppBasic.URLRoute = function ({path}, tag) {
        if (tag.getAttribute('exact') != null) {
            if (location.pathname == path)
                return tag.innerHTML;
        } else {
            if (location.pathname.startsWith(path))
                return tag.innerHTML;
        }
        return ``;
    }
    const rendercomp = {..._AppBasic, ...AppBasic};
    
    function RenderLoop() {
        const onrenders = [];
        let newtags = 1;
        while (newtags > 0) {
            newtags = 0;
            Object.keys(rendercomp).forEach(async key => {
                if (key == 'App') return;
                
                const tags = document.getElementsByTagName(key);
                for (const tag of tags) {
                    if (tag.attributes.rendered) continue;
                    tag.setAttribute('rendered', true);
                    const pjsid = GlobalRenderIndexer++;
                    tag.classList.add(`pjs-id-${pjsid}`);
                    const obj = {
                        onrender: () => {},
                        tag,
                        refresh: `document.getElementsByClassName("pjs-id-${pjsid}")[0].removeAttribute("rendered");RenderLoop()`
                    };
                    tag.innerHTML = rendercomp[key](extractAttr(tag.attributes), obj);
                    onrenders.push(obj);
                    newtags++;
                }
            });
        }

        for (const a of document.getElementsByTagName('a')) {
            if (a.getAttribute('route') == null) return;
            if (a.getAttribute('__href') != null) return;
            const href = a.href;
            a.setAttribute('__href', a.href);
            a.href = '';
            a.onclick = (e) => {
                e.preventDefault();
                history.replaceState({}, document.title, href);
                ProcessGlobalRender.router.removeAttribute('rendered');
                RenderLoop();
            };
        }

        onrenders.forEach(o => o.onrender(o.tag));
    }
    RenderLoop();
    window.RenderLoop = RenderLoop;
}
ProcessGlobalRender.router = undefined;

window.ProcessGlobalRender = ProcessGlobalRender;

let AppBasic = undefined;
if (getMeta('parse_html') == 'true') {
    fetch('/src/App.pjs').then(r => r.text()).then(r => {
        const content = r.replace(/\([ \r\n]+</g, '`<').replace(/>[ \r\n]+\)/g, '>`');
        import('data:text/javascript;base64,' + btoa(content)).then(r => {
            AppBasic = r.default;
            ProcessGlobalRender();
        });
    });
} else {
    import('/src/App.pjs').then(r => {
        AppBasic = r.default;
        ProcessGlobalRender();
    });
}