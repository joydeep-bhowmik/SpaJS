'use strict'
class SPA{
   constructor(){

    }

    init(args=null){
        
        this.link='a';
        if(args && args['link']){
            this.link=args['link'];
        }
        this.form='form';
        if(args && args['form']){
            this.form=args['form'];
        }
        
        this.executeScript=false;
        if(args && args['executeScript']){
            this.executeScript=args['executeScript'];
        }
        this.storage={};
        // this.storage[window.location.href]=document.documentElement.innerHTML;
        if(args && args['loader']){
            this.loader=args['loader'];
        }
        this.clean(document);
        this.bindForm();
        let onurlchangeEvent = new Event("onurlchange");
        //let spapercentComplete = new Event("spapercentComplete");
        //if clicked on mentioned link
        this.live(this.link, "click", function(e) {
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
                window.history.pushState({}, '', this.href);
                document.dispatchEvent(onurlchangeEvent);
            }
        });
        window.onpopstate = function() {
            document.dispatchEvent(onurlchangeEvent);
        }
        let self=this;
        document.addEventListener('onurlchange',async function(){
            let url=window.location.href;
            if(!self.storage[url]){
                let response=await self.fetch(url).then(function(res){ return res}).catch(function(error){
                    console.error(error);
                });
                self.storage[url]=response;
            }
            self.updateDOM(url)
        })
    }
    reorderKeys(vdom,dom){
        //remove unmatched keys from dom
        for(let i=0;i<dom.children.length;i++){
            let dnode=dom.children[i];
            if(dnode.hasAttribute('@key')){
                let key=dnode.getAttribute('@key');
                if(vdom.querySelectorAll(':scope > [@key="'+key+'"]').length>1){
                    throw `keys must be unique among siblings. Duplicate key found @key=${key}`;
                }
                //if the key is not present in vdom then remove it
                if(!vdom.querySelector(':scope > [@key="'+key+'"]')){
                    dnode.remove();
                }
            }
        }
        //adding keys to dom
        for(let i=0;i<vdom.children.length;i++){
            let  vnode=vdom.children[i];
            if( vnode.hasAttribute('@key')){
                let key= vnode.getAttribute('@key');
                
                if(dom.querySelector(':scope> [@key="'+key+'"]')){

                }else{
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
     updateDOM(url=null,response=null){
        let self=this;
        let vdom;
        if(url){
            vdom=this.parseHTML(this.storage[url]);
        }
        if(!url && response){
            vdom=this.parseHTML(response);
        }
        this.reorderKeys(vdom,document.documentElement);
        this.diff(vdom,document.documentElement);
        vdom.remove();
        if(this.executeScript){
            document.querySelectorAll('script').forEach(function(scriptTag,i){
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
                    let script=scriptTag.innerHTML;
                    eval(script);
                }
            })
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
            e.preventDefault();
            let action=this.getAttribute('action');
            let method=this.getAttribute('method');
            let data=self.serialize(this);
            if(!action) action=window.location.href;
            if(method.toLowerCase()=='get'){
                let parameters=new URLSearchParams(data).toString();
                let url=window.location.pathname+'?'+parameters;
                window.history.pushState({}, '', url);
            }
            let response=await self.fetch(action,{method:method,data:data}).then(function(res){
                return res;
            });
            self.updateDOM(null,response)
        });
    }

    fetch(url_, args = null) {
        return new Promise(function(resolve, reject) {
            let url = url_;
            let parameters,response,method;
            const xhttp = new XMLHttpRequest();
            xhttp.onerror = function(error){
                reject(error);
            }
            xhttp.onload = function() {
                 response;
                if (this.readyState == 4 && this.status == 200) {
                    response = this.responseText;
                    //response = decodeURIComponent(response);
                    resolve(response);
                } else {
                    if (this.status == 403) {
                        error = url + " 403 (Forbidden)";
                    } else if (this.status == 404) {
                        error = url + " 400 (Page not found)";
                    } else {
                        error = this.status;
                    }
                    reject(error);
                }
            };
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
            parameters=null;
            if(args && args['data']){
                parameters=new URLSearchParams(args['data']).toString();
            }
            if(args && args['method']){
                method=args['method'];
            }
        
            if (method && method.toUpperCase()=='POST') {
                if(!parameters){
                    let urlArr=url.split('?');
                    url=urlArr[0];
                    parameters=urlArr[1];
                    console.log(urlArr)
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
                if(parameters!=""){
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
            if (!vdom.getAttribute(key)) {
                dom.removeAttribute(key);
            }
        });
    }
    getnodeType(node) {
        if(node.nodeType==1) return node.tagName.toLowerCase();
        else return node.nodeType;
        
    };
     diff(vdom, dom) {
        //if dom has no childs then append the childs from vdom
        if (dom.hasChildNodes() == false && vdom.hasChildNodes() == true) {
            for (let i = 0; i < vdom.childNodes.length; i++) {
                //appending
                dom.append(vdom.childNodes[i].cloneNode(true));
            }
        } else {
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
                    // console.log("appenidng",vdom.childNodes[i])
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
                if(vdom.childNodes[i].nodeType != 3 || vdom.childNodes[i].nodeType != 8){
                    this.diff(vdom.childNodes[i], dom.childNodes[i])
                }
            }
        }
    }
}
const spa=new SPA();
