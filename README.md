# SpaJS
In my previous post about DOM diffing  algorithm we learned to create our own virtual DOM and got to know how DOM diffing actually works. In this post we will learn about how keys works and how we can add this feature to our virtual DOM . before we start the actual coding we must know why keys are necessary and whats the concept behind it.
## Importance of using keys
Keys tell our diffing algorithm to identify which items needs to be changed, or add, or  remove.
Without keys our algorithm will push update to a node even if we could achieve the same by simple moving the node.  Let me explain this with an example
```
|-------DOM-------------|---------VDOM--------|
|-----------------------|---------------------|
| <Li val="A">          | <Li val="A">        | 
| <Li val="B">          | <Li val="B">        | 
|                       | <Li val="C">        | 
|-----------------------|---------------------|
```
When we compare this DOM with the VDOM our algorithm just append the last child to our DOM. That's not a problem at all . The problems occurs when we face situation like this.
```
|-------DOM-------------|---------VDOM--------|
|-----------------------|---------------------|
| <Li val="A">          | <Li val="c">        | 
| <Li val="B">          | <Li val="A">        | 
|                       | <Li val="B">        | 
|-----------------------|---------------------|
```
In this case our algorithm will append the last node to our DOM and update the first node. But we could have just simply avoided this by prepending the last node to the DOM , and this would make the update much faster. That's where the keys come in.
```
|---------DOM-----------|-------VDOM----------|--------------------------|
| <Li key=1 val="A">    | <Li key=3 val="C">  | Moved from bottom to top |
| <Li key=2 val="B">    | <Li key=2 val="A">  | None                     |
|                       | <Li key=1 val="B">  | None                     |
|-----------------------|---------------------|--------------------------|
```
With the help of keys now we can tell our algorithm that no need to change everything just add the new node to the top. 

## Implementation
The implementation starts by simply adding the key attributes to our nodes, however the key attributes never get passed to DOM, but stays as a property of the node object.
Let's modify our previous codes to add key props. starting with clean function.
```javascript
function clean(node) {
    for (let n = 0; n < node.childNodes.length; n++) {
        let child = node.childNodes[n];
        if (child.nodeType === 8 ||(child.nodeType === 3 && !/\S/.test(child.nodeValue) && child.nodeValue.includes('\n'))) 
        {
            node.removeChild(child);
            n--;
        } else if (child.nodeType === 1) {
            if(child.hasAttribute('key')){
                let key=child.getAttribute('key');
                //adding the key property to the node object
                child.key=key;
                //removing the keys
                child.removeAttribute('key');
            }
            clean(child);
        }
    }
}
```

As our clean function iterates through all children we check if the node has the key attribute , if the case is true then we get the attribute value and set a key property with the value, then we remove the key attribute.

Now All of our nodes has the key property. Lets create our patchKeys function
```javascript
function patchKeys(vdom,dom){
        //remove unmatched keys from dom
        for(let i=0;i<dom.children.length;i++){
            let dnode=dom.children[i];
            let key=dnode.key;
            if(key){
                if(!hasTheKey(vdom,key)){
                    dnode.remove();
                }
            }
        }
        //adding keys to dom
        for(let i=0;i<vdom.children.length;i++){
            let  vnode=vdom.children[i];
            let key=vnode.key;
            if(key){
                if(!hasTheKey(dom,key)){
                    //if key is not present in dom then add it
                    //get the index of current node
                    let nthIndex=[].indexOf.call(vnode.parentNode.children, vnode);
                    if(dom.children[nthIndex]){
                        //adding before the same indexed node of dom
                        dom.children[nthIndex].before(vnode.cloneNode(true))
                    }else{
                        dom.append(vnode.cloneNode(true))
                    }
                }
            }
        }
    }
```

In the patchKey function  we iterate through the DOM and VDOM children. For DOM children if the key is not present in VDOM we remove the node from DOM and for VDOM children if the key is not present the DOM then we add it to the DOM, While adding a node to The DOM we need to maintain the ordering, for this we get the index of the VNODE and add it before the same indexed child of DOM, if the child is not present in DOM we just append the VNODE.

The hasKey function helps us to check if the key is present in the respective DOM.

```javascript
function hasTheKey(dom,key){
    let keymatched=false;
    for(let i=0;i<dom.children.length;i++){
        //if the key is present the break theloop
        if(key==dom.children[i].key) {
        //update the keymacthed status
            keymatched=true;
            break};
    }
    return keymatched;
}
```
In the hasKey function we iterate thought a Parent Nodes children to check if the desired key is present, the function returns true/false accordingly. 


Now all we need is to add this to our diff function
```javascript
function diff(vdom, dom) {
    //if dom has no childs then append the childs from vdom
    if (dom.hasChildNodes() == false && vdom.hasChildNodes() == true) {
        //codes
    } else {
        patchKeys(vdom,dom);
        //codes
    }
}
```

Now this is our Whole code after adding the key feature
```javascript
function getnodeType(node) {
        if(node.nodeType==1) return node.tagName.toLowerCase();
        else return node.nodeType;
    };
function clean(node) {
    for (let n = 0; n < node.childNodes.length; n++) {
        let child = node.childNodes[n];
        if (child.nodeType === 8 ||(child.nodeType === 3 && !/\S/.test(child.nodeValue) && child.nodeValue.includes('\n'))) 
        {
            node.removeChild(child);
            n--;
        } else if (child.nodeType === 1) {
            if(child.hasAttribute('key')){
                let key=child.getAttribute('key');
                child.key=key;
                child.removeAttribute('key');
            }
            clean(child);
        }
    }
}
function parseHTML(str) {
    let parser = new DOMParser();
    let doc = parser.parseFromString(str, 'text/html');
    clean(doc.body);
    return doc.body;
}

function attrbutesIndex(el) {
    var attributes = {};
    if (el.attributes == undefined) return attributes;
    for (var i = 0, atts = el.attributes, n = atts.length; i < n; i++) {
        attributes[atts[i].name] = atts[i].value;
    }
    return attributes;
}
function patchAttributes(vdom, dom) {
    let vdomAttributes = attrbutesIndex(vdom);
    let domAttributes = attrbutesIndex(dom);
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
function hasTheKey(dom,key){
    let keymatched=false;
    for(let i=0;i<dom.children.length;i++){
        if(key==dom.children[i].key) {
            keymatched=true;
            break};
    }
    return keymatched;
}
function patchKeys(vdom,dom){
        //remove unmatched keys from dom
        for(let i=0;i<dom.children.length;i++){
            let dnode=dom.children[i];
            let key=dnode.key;
            if(key){
                if(!hasTheKey(vdom,key)){
                    dnode.remove();
                }
            }
        }
        //adding keys to dom
        for(let i=0;i<vdom.children.length;i++){
            let  vnode=vdom.children[i];
            let key=vnode.key;
            if(key){
                if(!hasTheKey(dom,key)){
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
function diff(vdom, dom) {
    //if dom has no childs then append the childs from vdom
    if (dom.hasChildNodes() == false && vdom.hasChildNodes() == true) {
        for (var i = 0; i < vdom.childNodes.length; i++) {
            //appending
            dom.append(vdom.childNodes[i].cloneNode(true));
        }
    } else {
        patchKeys(vdom,dom);
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
        for (var i = 0; i < vdom.childNodes.length; i++) {
            //if the node is not present in dom append it
            if (dom.childNodes[i] == undefined) {
                dom.append(vdom.childNodes[i].cloneNode(true));
                // console.log("appenidng",vdom.childNodes[i])
            } else if (getnodeType(vdom.childNodes[i]) == getnodeType(dom.childNodes[i])) {
                //if same node type
                //if the nodeType is text
                if (vdom.childNodes[i].nodeType == 3) {
                    //we check if the text content is not same
                    if (vdom.childNodes[i].textContent != dom.childNodes[i].textContent) {
                        //replace the text content
                        dom.childNodes[i].textContent = vdom.childNodes[i].textContent;
                    } 
                }else {
                        patchAttributes(vdom.childNodes[i], dom.childNodes[i])
                    }
            } else {
                //replace
                dom.childNodes[i].replaceWith(vdom.childNodes[i].cloneNode(true));
            }
            if(vdom.childNodes[i].nodeType != 3){
                diff(vdom.childNodes[i], dom.childNodes[i])
            }
        }
    }
}
```

Lets see if it works. 
```javascript
|-------DOM-------------|--------VDOM---------|--------action------------|
| <Li key=1 val="1">    | <Li key=1 val="1">  | Node                     |
| <Li key=2 val="2">    | <Li key=3 val="3">  | Add this before key 2    |
|                       | <Li key=2 val="2">  | Node                     |
|-----------------------|---------------------|--------------------------|
```
```html
<div id="node">
    <ul>
        <li key="1">1</li>
        <li key="2">2</li>
    </ul>
</div>
<button>Diff</button>
<script>
 let vdom = parseHTML(`
<ul>
<li key="1">1</li>
<li key="3">3</li>
<li key="2">2</li>
</ul>`);
let dom = document.getElementById('node');
clean(dom);
document.querySelector('button').addEventListener('click',function(){
    diff(vdom,dom);
})
</script>
```
## The result
![results](image/keys-case-1.gif)
</>

