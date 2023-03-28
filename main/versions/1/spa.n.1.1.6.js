'use strict'
class SPA{
   constructor(){

    }

    init(args=null){
        let self=this;
        this.requestStart=function(){};
        this.requestComplete=function(){};
        this.requestError=function(){};
        if(args && args['requestStart']){
            this.requestStart=args['requestStart'];
        }
        if(args && args['requestComplete']){
            this.requestComplete=args['requestComplete'];
        }
        if(args && args['requestError']){
            this.requestError=args['requestError'];
        }
        this.clean(document);
        this.link='a';
        if(args && args['link']){
            this.link=args['link'];
        }
        this.form='form';
        if(args && args['form']){
            this.form=args['form'];
        }
        this.saveFomResults=false;
        if(args && args['saveFomResults']){
            this.saveFomResults=args['saveFomResults'];
        }
        this.script=false;
        if(args && args['script']){
            this.script=args['script'];
        }
        this.executeScriptEl=false;
        if(args && args['executeScriptEl']){
            this.executeScriptEl=args['executeScriptEl'];
        }
        this.storage={};
        this.scrollPositionsX={};
        this.scrollPositionsY={};
        this.storage[this.getCurrentUrl()]=document.documentElement.outerHTML;
        if(args && args['loader']){
            this.loader=args['loader'];
        }
        this.bindForm();
        this.scrollRestoration=true;
        if(args && args['scrollRestoration']){
            this.scrollRestoration=args['scrollRestoration'];
        }
        this.scrollBehavior=null;
        if(args && args['scrollBehavior']){
            this.scrollBehavior=args['scrollBehavior'];
        }
        //save scroll position
        window.addEventListener("scroll",function(){
            let url=self.getCurrentUrl();
            //horizontal scroll
            self.scrollPositionsX[url]=window.pageXOffset;
            //vertical scroll
            self.scrollPositionsY[url]=window.pageYOffset;
        });

        this.onurlchangeEvent = new Event("onurlchange",{bubbles: true});
        let current_hash=window.location.hash;
        window.addEventListener('popstate',function(e){
            window.eventType='popstate';
            //if its  hashchnage the statewill e null
            if (e.target.location.hash ==current_hash ){
                document.dispatchEvent(self.onurlchangeEvent);
             } else {
               current_hash = e.target.location.hash;
             }  
        });
        //let spapercentComplete = new Event("spapercentComplete");
        //if clicked on mentioned link
        this.live(this.link, "click", function(e) {
            let urlObj = new URL(this.href);
             //return if link is only hash
             if(this.getAttribute('href').startsWith('#')){
                return;
             }
            //basically if a link has onclick attribute the route will not work for it
            let clickattr = this.getAttribute('onclick');
            if (clickattr) return;
            e.preventDefault();
            //check if target attr is present
            let target = this.getAttribute('target');
            if (target) {
                window.open(this.href, target);
                return;
            }
            //if link origin is not same then redirect to the mentioned link
            //the link
            let refLocation = (new URL(this.href));
            //if provided link host name is same as current host name
            if (refLocation.hostname != location.hostname) {
                //open external links
                window.open(this.href, "_self");
                return;
            }
            if (this.href != window.location.href) {
                window.eventType='pushstate';
                window.history.pushState({}, document.title,urlObj.href.replace(urlObj.origin, ''));
                 document.dispatchEvent(self.onurlchangeEvent);
                 
            }
        });

        if(this.script){
            this.script()
        }
        document.addEventListener('onurlchange',async function(e){
            let url=self.getCurrentUrl();
            if(!self.storage[url]){
                let response=await self.fetch(url).then(function(res){ return res}).catch(function(error){
                    console.error(error);
                });
                self.storage[url]=response;
            }
            self.updateDOM(url);
            if(self.script){
                self.script();
            }
            //scroll restoration
            if(self.scrollRestoration){
                if( window.eventType=='pushstate'){
              
                    setTimeout(() => {
                        window.scroll({
                            top: '0px',
                            behavior:self.scrollBehavior
                          });
                    }, 0);
                    //horizontal scroll
                    self.scrollPositionsX[url]=window.pageXOffset;
                    //vertical scroll
                    self.scrollPositionsY[url]=window.pageYOffset;
                }else if(window.eventType=='popstate'){
                //setting default scrollbehaviour of browser to manual on pushstate
                var axisY=self.scrollPositionsY[url];
                var axisX=self.scrollPositionsX[url];
                console.log(axisY,axisX,url)
                if(axisY==undefined){
                    axisY=0;
                }
                if(axisX==undefined){
                    axisX=0;
                }
                
                setTimeout(() => {
                    window.scroll({
                        top: axisY,
                        left:axisX,
                        behavior:self.scrollBehavior
                      });
                }, 0);
                }
            }
        })
    }
    getCurrentUrl(){
        return window.location.href.replace(window.location.hash,' ')
    }

     updateDOM(url=null,response=null){
        let self=this;
        let vdom;
        if(url){
            vdom=this.parseHTML(this.storage[url]);
        }
        if(!url && response){
            vdom=this.parseHTML(response);
        }
        this.diff(vdom,document.documentElement);
        vdom.remove();
        if(this.executeScriptEl){
            let script="";
            document.querySelectorAll(this.executeScriptEl).forEach(function(scriptTag,i){
                if(scriptTag.hasAttribute('spa-script')) return;
                if(scriptTag.hasAttribute('src')){
                    let parentNode=scriptTag.parentNode;
                    let nthIndex=[].indexOf.call(parentNode.children, scriptTag);
                    let attributres=self.attrbutesIndex(scriptTag);
                    scriptTag.remove();
                    let newScriptTag=document.createElement('script');
                    Object.keys(attributres).forEach(function(key){
                        newScriptTag.setAttribute(key,attributres[key]);
                    });
                    if(parentNode.children[nthIndex]){
                        parentNode.children[nthIndex].before(newScriptTag)
                    }else{
                        parentNode.append(newScriptTag)
                    }
                }else{
                    script+=scriptTag.innerHTML;
                }
            });
            eval(script);
        }
    }

    live(selector, evt, handler) {
        document.addEventListener(evt, function(event) {
            if (event.target.matches(selector + ', ' + selector + ' *')) {
                handler.apply(event.target.closest(selector), arguments);
            }
        }, false);
    }
    serialize(form) {
        let data = new FormData(form);
        let obj = {};
        for (let [key, value] of data) {
            if (obj[key] !== undefined) {
                if (!Array.isArray(obj[key])) {
                    obj[key] = [obj[key]];
                }
                obj[key].push(value);
            } else {
                obj[key] = value;
            }
        }
        return obj;
    }
    bindForm(){
        let self=this;
        this.live(this.form,'submit',async function(e){
            //if link origin is not same then redirect to the mentioned link
            //the link
            let refLocation = (new URL(this.getAttribute('action')));
            //if provided link host name is same as current host name
            if (refLocation.hostname != location.hostname) {
                return;
            }
            e.preventDefault();
            let action=this.getAttribute('action');
            let method=this.getAttribute('method');
            let data=self.serialize(this);
            let url="";
            let parameters=new URLSearchParams(data).toString();
            if(method.toLowerCase()=='get'){
                url=action+'?'+parameters;
                if(window.location.pathname+'?'+parameters!=window.location.href){
                    window.history.pushState({}, '', url);
                }
                if(self.saveFomResults){
                    document.dispatchEvent(self.onurlchangeEvent);
                }else{
                    let response=await self.fetch(action,{method:method,data:data}).then(function(res){
                        return res;
                    });
                    self.updateDOM(null,response)
                }
            }else{
                if(!action) action=window.location.href;
                let response=await self.fetch(action,{method:method,data:data}).then(function(res){
                    return res;
                });
                self.updateDOM(null,response)
            }
        });
    }

    fetch(url_, args = null) {
        let requestStart=this.requestStart;
        let requestComplete=this.requestComplete;
        let requestError=this.requestError;
        requestStart();
        return new Promise(function(resolve, reject) {
            let url = url_;
            let parameters,response,method,error;
            const xhttp = new XMLHttpRequest();
            xhttp.onerror = function(error){
                requestError(error);
            }
            xhttp.onload = function() {
                 response;
                if (this.readyState == 4 && this.status == 200) {
                    response = this.responseText;
                    //response = decodeURIComponent(response);
                    resolve(response);
                    requestComplete(response);
                } else {
                    this.status
                    reject(this.status);
                    requestError(this.status);
                }
            };
            document.addEventListener('onurlchange',function(){
                xhttp.abort();
            });
            // Download progress
            xhttp.addEventListener("progress", function(evt){
                if (evt.lengthComputable) {
                    let percentComplete = evt.loaded / evt.total * 100;
                        // Do something with download progress
                        if(document.querySelector(self.loader)){
                            document.querySelector(self.loader).setAttribute('percentComplete',percentComplete);
                        }
                    }
                }, false);
            parameters="";
            if(args && args['data']){
                parameters=new URLSearchParams(args['data']).toString();
            }
            if(args && args['method']){
                method=args['method'];
            }
        
            if (method && method.toUpperCase()=='POST') {
                if(parameters.length!=0){
                    let urlArr=url.split('?');
                    url=urlArr[0];
                    parameters=urlArr[1];
                }
                
                xhttp.open("POST", url, true);
                if (args && 'headers' in args) {
                    headers = args['headers'];
                    for (let key in headers) {
                        xhttp.setRequestHeader(key, headers[key])
                    }
                } else {
                    xhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
                }
                xhttp.send(parameters);
            } else if (!method || method.toUpperCase()=='GET'){
                if(parameters.length!=0){
                    xhttp.open("GET", url + "?" + parameters, true);
                }else{
                    xhttp.open("GET", url, true);
                }
                
                if (args && 'headers' in args) {
                    headers = args['headers'];
                    for (let key in headers) {
                        xhttp.setRequestHeader(key, headers[key])
                    }
                } else {
                    xhttp.setRequestHeader("X-Requested-With", "XMLHttpRequest");
                }
                xhttp.send();
            }else{
                xhttp.open(method, url + "?" + parameters, true);
                if (args && 'headers' in args) {
                    headers = args['headers'];
                    for (let key in headers) {
                        xhttp.setRequestHeader(key, headers[key])
                    }
                } else {
                    xhttp.setRequestHeader("X-Requested-With", "XMLHttpRequest");
                }
                xhttp.send();
            }

        });
    }
    prefetch(url){
        let self=this;
        this.fetch(url).then(function(response){
            self.storage[url]=response;
        });
    }
    clean(node) {
        for (let n = 0; n < node.childNodes.length; n++) {
            let child = node.childNodes[n];
            if (
                child.nodeType === 8 ||
                (child.nodeType === 3 && !/\S/.test(child.nodeValue))
            ) {
                node.removeChild(child);
                n--;
            } else if (child.nodeType === 1) {
                this.clean(child);
            }
        }
    }
    
    parseHTML(str) {
        if(str instanceof HTMLElement){
            this.clean(str);
            return str;
        }
        if(str.nodeType==9){
            return str;
        }
        let parser = new DOMParser();
        let doc = parser.parseFromString(str, 'text/html');
        this.clean(doc);
        return doc.documentElement;
    }
    
    attrbutesIndex(el) {
        let attributes = {};
        if (el.attributes == undefined) return attributes;
        for (let i = 0, atts = el.attributes, n = atts.length; i < n; i++) {
            attributes[atts[i].name] = atts[i].value;
        }
        return attributes;
    }
    patchAttributes(vdom, dom) {
        let vdomAttributes = this.attrbutesIndex(vdom);
        let domAttributes = this.attrbutesIndex(dom);
        if (vdomAttributes == domAttributes) return;
        Object.keys(vdomAttributes).forEach((key, i) => {
            //if the attribute is not present in dom then add it
            if (!dom.getAttribute(key)) {
                dom.setAttribute(key, vdomAttributes[key]);
            } //if the atrtribute is present than compare it
            else if (dom.getAttribute(key)) {
                if (vdomAttributes[key] != domAttributes[key]) {
                    dom.setAttribute(key, vdomAttributes[key]);
                }
            }
        });
        Object.keys(domAttributes).forEach((key, i) => {
            //if the attribute is not present in vdom than remove it
            //for chrome bug [showing value after removing value attribute]

            if (!vdom.getAttribute(key)) {
                dom.removeAttribute(key);
            }
        });
    }
    getnodeType(node) {
        if(node.nodeType==1) return node.tagName.toLowerCase();
        if(node.nodeType==3 || node.nodeType==8 ) return 'text';
        return node.nodeType;
    };
    reorderKeys(vdom,dom){
        //remove unmatched keys from dom
        for(let i=0;i<dom.children.length;i++){
            let dnode=dom.children[i];
            if(dnode.hasAttribute('s-key')){
                let key=dnode.getAttribute('s-key');
                if(vdom.querySelectorAll(':scope > [s-key="'+key+'"]').length>1){
                    throw `keys must be unique among siblings. Duplicate key found key=${key}`;
                }
                //if the key is not present in vdom then remove it
                if(!vdom.querySelector(':scope > [s-key="'+key+'"]')){
                    dnode.remove();
                }
            }
        }
        //adding keys to dom
        for(let i=0;i<vdom.children.length;i++){
            let  vnode=vdom.children[i];
            if( vnode.hasAttribute('s-key')){
                let key= vnode.getAttribute('s-key');
                if(!dom.querySelector(':scope> [s-key="'+key+'"]')){
                    //if key is not present in dom then add it
                    let nthIndex=[].indexOf.call(vnode.parentNode.children, vnode);
                    if(dom.children[nthIndex]){
                        dom.children[nthIndex].before(vnode.cloneNode(true))
                    }else{
                        dom.append(vnode.cloneNode(true))
                    }
                }
            }
        }
    }
    diff(vdom, dom) {
        //if dom has no childs then append the childs from vdom
        if (dom.hasChildNodes() == false && vdom.hasChildNodes() == true) {
            for (let i = 0; i < vdom.childNodes.length; i++) {
                //appending
                dom.append(vdom.childNodes[i].cloneNode(true));
            }
        } else {
            this.reorderKeys(vdom, dom);
            //if dom has extra child
            if (dom.childNodes.length > vdom.childNodes.length) {
                let count = dom.childNodes.length - vdom.childNodes.length;
                if (count > 0) {
                    for (; count > 0; count--) {
                        dom.childNodes[dom.childNodes.length - count].remove();
                    }
                }
            }
            //now comparing all childs
            for (let i = 0; i < vdom.childNodes.length; i++) {
                //if the node is not present in dom append it
                if (dom.childNodes[i] == undefined) {
                    dom.append(vdom.childNodes[i].cloneNode(true));
                } else if (this.getnodeType(vdom.childNodes[i]) == this.getnodeType(dom.childNodes[i])) {
                    //if same node type
                    //if the nodeType is text
                    if (vdom.childNodes[i].nodeType == 3 || vdom.childNodes[i].nodeType == 8) {
                        //we check if the text content is not same
                        if (vdom.childNodes[i].textContent != dom.childNodes[i].textContent) {
                            //replace the text content
                            dom.childNodes[i].textContent = vdom.childNodes[i].textContent;
                        } 
                    }else if(vdom.childNodes[i].nodeType != 10){
                            this.patchAttributes(vdom.childNodes[i], dom.childNodes[i])
                        }
                } else {
                    //replace
                    dom.childNodes[i].replaceWith(vdom.childNodes[i].cloneNode(true));
                }
                if(this.getnodeType(vdom.childNodes[i])!='text'){
                    this.diff(vdom.childNodes[i], dom.childNodes[i])
                }
            }
        }
    }
}
const spa=new SPA();
