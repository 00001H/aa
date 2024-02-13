import {Game} from "./aad.js";
let game = new Game();
let WORDSIZE = 70;
let PERSISTENT_SAVE = true;
let _storeto = (PERSISTENT_SAVE?localStorage:sessionStorage);
let page = null;
let hoverpopup = {};
let sidebar = {};
let gamemenu = {};
let dictpopup = {};
let WORDPAD = 0.1;
let interactive = false;
let TOROOT="404";
function defaultunit(x,un){
    if(typeof(x) === "number"){
        return x+un;
    }
    return x;
}
function emove(elem,x,y){
    elem.style.setProperty("left",defaultunit(x,"px"));
    elem.style.setProperty("top",defaultunit(y,"px"));
}
function eresize(elem,w,h){
    elem.style.setProperty("width",defaultunit(w,"px"));
    elem.style.setProperty("height",defaultunit(h,"px"));
}
function ehide(elem){
    elem.style.setProperty("display","none");
}
function eunhide(elem,d="block"){
    elem.style.setProperty("display",d);
}
class Placeable{
    place(par,x,y,size){
        let elem = this.make(size);
        emove(elem,x,y);
        par.append(elem);
    }
}
class Glyph extends Placeable{
    constructor(g){
        super();
        this.g = g;
    }
    make(size){
        let img = document.createElement("img");
        img.classList.add("glyph");
        eresize(img,size,size);
        img.draggable = false;
        img.src = TOROOT+`/glyphs/${this.glyph('spc')}.svg`;
        return img;
    }
    glyph(orelse=""){
        return (this.g==='.'?orelse:this.g);
    }
}
class TextUnit extends Placeable{
    constructor(g){
        super();
        if(g instanceof Array){
            this.g = g;
        }else if(typeof(g)==="string"||g instanceof String){
            this.g = [];
            for(let gl of g){
                this.g.push(new Glyph(gl));
            }
        }else{
            this.g = null;
        }
        while(this.g.length<4){
            this.g.push(new Glyph('.'));
        }
    }
    word(){
        let s = "";
        for(let gl of this.g){
            s += gl.glyph();
        }
        return s;
    }
    make(size){
        let div = newdiv("textunit");
        eresize(div,size,size);
        this.g[0].place(div,0,0,size/2);
        this.g[1].place(div,size/2,0,size/2);
        this.g[2].place(div,0,size/2,size/2);
        this.g[3].place(div,size/2,size/2,size/2);
        return div;
    }
}
class Word extends Placeable{
    constructor(g,interactive=undefined){
        super();
        this.interactive = interactive;
        this.parent = null;
        if(g instanceof TextUnit){
            this.g = [g];
        }else{
            this.g = g;
        }
    }
    addu(tu){
        this.g.push(tu);
    }
    word(){
        let s = "";
        for(let i=0;i<this.g.length;++i){
            s += this.g[i].word();
            if(i+1<this.g.length){
                s += '-';
            }
        }
        return s;
    }
    width(size){
        return size*(this.g.length*(1+WORDPAD)-WORDPAD);
    }
    trans(){
        return game.getguessrich(this.word());
    }
    make(size){
        let div = newdiv("word");
        eresize(div,this.width(size),size);
        let x = 0;
        for(let gl of this.g){
            gl.place(div,x,0,size);
            x += size*(1+WORDPAD);
        }
        let __capthis = this;
        if(this.interactive||(this.interactive===undefined&&interactive)){
            div.onmouseenter = function(){
                hoverpopup.box.style.setProperty("opacity",1);
                hoverpopup.resettrans();
                hoverpopup.stranssrc = __capthis.parent;
                hoverpopup.wtranssrc = __capthis;
                game.see(__capthis.word());
                game.save(_storeto);
                hoverpopup.trans();
            };
            div.onclick = function(){
                sidebar.loadword(__capthis.word());
                sidebar.show();
                sidebar.guessbox.focus();
            }
            div.onmouseleave = function(){
                hoverpopup.hide();
            };
        }
        for(let i=1;i<this.g.length;++i){
            let img = document.createElement("img");
            img.classList.add("line");
            emove(img,size*(i*(1+WORDPAD)-WORDPAD),0);
            eresize(img,size*WORDPAD,size);
            img.src = TOROOT+`/glyphs/line.svg`;
            div.append(img);
        }
        return div;
    }
}
class Sentence extends Placeable{
    constructor(g,interactive=undefined){
        super();
        if(g instanceof Array){
            g.forEach(this.pushg);
        }else if(typeof(g)==="string"||g instanceof String){
            this.g = [];
            let tkn = "";
            let p = 0;
            let wdg = null;
            for(let gl of g){
                if(gl==='\n'){
                    this.pushg(null);
                    continue;
                }
                if(gl==='-'){
                    if(tkn.length > 0){
                        while(tkn.length<4){
                            tkn += '.';
                        }
                        let tu = new TextUnit(tkn);
                        if(wdg === null){
                            wdg = new Word(tu,interactive);
                        }else{
                            wdg.addu(tu);
                        }
                        tkn = "";
                        p = 0;
                    }else{
                        wdg = this.popg();
                    }
                }else{
                    tkn += gl;
                    ++p;
                    if(p>=4){
                        let tu = new TextUnit(tkn);
                        if(wdg === null){
                            this.pushg(new Word(tu,interactive));
                        }else{
                            wdg.addu(tu);
                            this.pushg(wdg);
                        }
                        tkn = "";
                        p = 0;
                    }
                }
            }
        }else{
            this.g = null;
        }
    }
    popg(){
        let g = this.g.pop();
        g.parent = null;
        return g;
    }
    pushg(g){
        if(g !== null)g.parent = this;
        this.g.push(g);
    }
    trans(){
        let s = "";
        for(let i=0;i<this.g.length;++i){
            if(this.g[i] === null){
                s += '\n';
            }else{
                s += this.g[i].trans();
            }
            if(i+1<this.g.length){
                s += ' ';
            }
        }
        return s;
    }
    dims(wsize){
        let padsize = WORDPAD*wsize;
        let x = 0;
        let y = wsize;
        let mx = 0;
        for(let i=0;i<this.g.length;++i){
            if(this.g[i] === null){
                x = 0;
                y += padsize+wsize;
            }else{
                x += this.g[i].width(wsize)+padsize;
                mx = Math.max(x-padsize,mx);
            }
        }
        return [mx,y];
    }
    make(wsize){
        let div = newdiv("sentence");
        let x = 0;
        let y = 0;
        let mx = 0;
        let padsize = WORDPAD*wsize;
        for(let gl of this.g){
            if(gl === null){
                x = 0;
                y += padsize+wsize;
            }else{
                gl.place(div,x,y,wsize);
                x += gl.width(wsize)+padsize;
                mx = Math.max(x-padsize,mx);
            }
        }
        eresize(div,mx,y+wsize);
        return div;
    }
};
class SentenceElement extends HTMLElement{
    constructor(){
        super();
    }
    connectedCallback(){
        let div = newdiv();
        if(this.hasAttribute("style")){
            div.setAttribute("style",this.getAttribute("style"));
        }
        let stc = new Sentence(this.getAttribute("s").replace("|","\n"));
        let dz = stc.dims(WORDSIZE);
        eresize(div,dz[0],dz[1]);
        stc.place(div,this.pageX,this.pageY,WORDSIZE);
        this.replaceWith(div);
    }
}
function newdiv(...classes){
    let element = document.createElement("div");
    if(classes.length)element.classList.add(...classes);
    return element;
}
class TabBox{
    constructor(){
        this.element = newdiv();
        this.inner = newdiv("tbb");
        this.bar = newdiv("tbbbar");
        this.inner.append(this.bar);
        this.body = newdiv();
        this.inner.append(this.body);
        this.element.append(this.inner);
        this.tabs = {}
        this.tabns = []
        this.active = null;
    }
    _mktablabel(name){
        let lbl = newdiv("tbblabel");
        lbl.textContent = name;
        let __capthis = this;
        lbl.onclick = function(e){
            __capthis.selecttab(name);
            e.stopPropagation();
        }
        return lbl;
    }
    addtab(name,content,select=false){
        let label = this._mktablabel(name);
        this.bar.append(label);
        this.body.append(content);
        content.classList.add("tbbbody");
        ehide(content);
        this.tabns.push(name);
        this.tabs[name] = {"label":label,"content":content};
        if(select)this.selecttab(name);
        return content;
    }
    selecttabi(i){
        this.selecttab(this.tabns[i]);
    }
    selecttab(name){
        if(this.active !== null){
            this.tabs[this.active].label.classList.remove("active");
            ehide(this.tabs[this.active].content);
        }
        this.active = name;
        this.tabs[name].label.classList.add("active");
        eunhide(this.tabs[name].content);
    }
};
function mkmdldialog(){
    let dlg = document.createElement("dialog");
    dlg.tabIndex = -1;
    dlg.classList.add("modal");
    dlg.inner = newdiv();
    dlg.append(dlg.inner);
    dlg.onclick = function(){
        this.close();
    }
    dlg.inner.onclick = function(e){
        e.stopPropagation();
    }
    document.body.append(dlg);
    return dlg;
}
function updateguesses(){
    hoverpopup.trans();
    game.save(_storeto);
    updatestats();
    for(let gb of document.getElementsByClassName("guessbox")){
        gb.value = game.getguess(gb.getAttribute("word"));
    }
}
function updatestats(){
    document.getElementById("mentry_ntrans").textContent = "# words translated: "+game.trcount();
}
function init_hover_popup(){
    hoverpopup.hide = function(){
        this.box.style.setProperty("opacity",0);
    }
    hoverpopup.show = function(){
        this.box.style.setProperty("opacity",1);
    }
    hoverpopup.resettrans = function(){
        this.stranssrc = null;
        this.wtranssrc = null;
    }
    hoverpopup.resettrans();
    hoverpopup.trans = function(){
        if(this.stranssrc === null || this.stranssrc.g.length <= 1){
            ehide(this.strans);
        }else{
            eunhide(this.strans);
            this.strans.innerHTML = this.stranssrc.trans().replace("\n","<br>");
        }
        if(this.wtranssrc === null){
            ehide(this.wtrans);
        }else{
            eunhide(this.wtrans);
            this.wtrans.innerHTML = this.wtranssrc.trans().replace("\n","<br>");
        }
    }
    hoverpopup.box = newdiv("popup-box");
    hoverpopup.box.style.setProperty("opacity",0);

    hoverpopup.strans = document.createElement("p");
    hoverpopup.strans.classList.add("popup-str");
    hoverpopup.box.append(hoverpopup.strans);

    hoverpopup.wtrans = document.createElement("p");
    hoverpopup.wtrans.classList.add("popup-wtr");
    hoverpopup.box.append(hoverpopup.wtrans);

    onmousemove = function(e){
        hoverpopup.box.style.setProperty("left",e.pageX+"px");
        hoverpopup.box.style.setProperty("top",e.pageY+"px");
    }
    document.body.append(hoverpopup.box);
}
function assoc_guessbox(gb){
    gb.oninput = function(){
        game.setguess(this.getAttribute("word"),this.value);
        updateguesses();
    };
}
function update_guessbox_word(gb,wd){
    gb.setAttribute("word",wd);
}
function set_guessbox(gb){
    gb.type = "text";
    gb.name = "guessbox";
    gb.classList.add("guessbox");
    gb.placeholder = "...";
    assoc_guessbox(gb);
}
function init_sidebar(){
    function init_sidebar_toolbar(){
        sidebar.toolbar = {}
    
        sidebar.toolbar.bar_outer = newdiv("toolbar-outer");
        sidebar.boxbg.append(sidebar.toolbar.bar_outer);
    
        sidebar.toolbar.bar = newdiv("toolbar");
        sidebar.toolbar.bar_outer.append(sidebar.toolbar.bar);
    
        function new_toolbar_button(imgsrc,onclick){
            let button = document.createElement("img");
            button.src = imgsrc;
            button.classList.add("button");
            button.onclick = onclick;
            sidebar.toolbar.bar.append(button);
            return button;
        }
    
        sidebar.toolbar.dictbutton = new_toolbar_button(TOROOT+"/glyphs/a.svg", function(){
            dictpopup.updatecontents();
            dictpopup.dlg.showModal();
        });
    
        sidebar.toolbar.menubutton = new_toolbar_button(TOROOT+"/misc/ellipses.svg", function(){
            gamemenu.dlg.showModal();
        });
    }
    function init_sidebar_wordbox(){
        sidebar.wordbox = newdiv("word-bg-box");
        sidebar.box.append(sidebar.wordbox);
    
        sidebar.wordbox_inner = newdiv("box","word-bb-inner-container");
        sidebar.wordbox.append(sidebar.wordbox_inner);
        sidebar.guessbox = document.createElement("input");
        set_guessbox(sidebar.guessbox);
        sidebar.setword("....");
        sidebar.guessbox.size = 25;
        sidebar.box.append(sidebar.guessbox);
    }
    sidebar.setword = function(word){
        this.word = word;
        update_guessbox_word(this.guessbox,word);
        if(this.wordelement instanceof Element){
            this.wordelement.remove();
        }
        this.wordelement = new Sentence(word).make(WORDSIZE);
        this.wordbox_inner.append(this.wordelement);
    }
    sidebar.loadword = function(word){
        this.setword(word);
        this.guessbox.value = game.getguess(word);
    }
    sidebar.show = function(){
        this.box.style.setProperty("visibility","visible");
    }
    sidebar.hide = function(){
        this.box.style.setProperty("visibility","hidden");
    }
    sidebar.boxbg = newdiv("sidebar");
    document.body.append(sidebar.boxbg);

    sidebar.box = newdiv();
    sidebar.boxbg.append(sidebar.box);
    init_sidebar_wordbox();
    init_sidebar_toolbar();
}
function delchildren(e){
    e.innerHTML = "";
}
function init_dict(){
    dictpopup.dlg = mkmdldialog();
    dictpopup.dlg.classList.add("dict");
    dictpopup.updatecontents = function(){
        let dlgi = dictpopup.dlg.inner;
        delchildren(dlgi);
        let trt = game.seen_array().sort(function(a,b){
            if(a.length!=b.length)return a.length-b.length;
            if(a<b)return -1;
            return (a==b)?0:1;
        });
        const ELEMENTS_IN_A_ROW = 5;
        let ec = 0;
        for(let word of trt){
            let entryouter = newdiv("dictentryouter");
            let entry = newdiv("dictentry");
            entry.append(new Sentence(word,false).make(WORDSIZE));
            let lbvb = newdiv("dictguessvcb");
            entry.append(lbvb);
            let gb = document.createElement("input");
            gb.type = "text";
            set_guessbox(gb);
            update_guessbox_word(gb,word);
            gb.classList.add("dictguess");
            gb.value = game.getguess(word);
            lbvb.append(gb);
            entryouter.append(entry);
            dlgi.append(entryouter);
            if(++ec >= ELEMENTS_IN_A_ROW){
                dlgi.append(document.createElement("br"));
                ec = 0;
            }
        }
    }
}
function init_menu(){
    gamemenu.dlg = mkmdldialog();
    gamemenu.main = new TabBox();
    gamemenu.infotab = gamemenu.main.addtab("info",newdiv("menucontent"));
    function mentry(tab,id=undefined,placeholder=""){
        let et = newdiv("menuentry");
        et.textContent = placeholder;
        if(id !== undefined)et.id = "mentry_"+id;
        tab.append(et);
    }
    mentry(gamemenu.infotab,"ntrans","Hello");
    gamemenu.settingstab = gamemenu.main.addtab("settings",newdiv("menucontent"));
    gamemenu.dlg.inner.append(gamemenu.main.element);
    function resetmenu(){
        gamemenu.main.selecttabi(0);
    }
    gamemenu.dlg.onclose = resetmenu;
    resetmenu();
}
function set_absolute_positions(){
    var elements = document.getElementsByTagName("*");
    let e;
    let i = 0;
    while((e=elements[i++])!==undefined){
        let p = e.getAttribute("p");
        if(p !== null){
            let [x,y] = p.split(' ');
            e.style.setProperty("position","absolute");
            emove(e,x,y);
            e.removeAttribute("p");
        }
    }
}
onload = function(){
    switch (screen.orientation.type){
        case "landscape-primary":
            break;
        case "landscape-secondary":
            //use upside-down if you want
            break;
        case "portrait-secondary":
        case "portrait-primary":
            alert("This game is best played with landscape mode.");
            break;
        default:
            break;
    }
    page = document.getElementById("page");
    interactive = !page.hasAttribute("noninteractive");
    console.log("Interactive: ",interactive);
    if(page.hasAttribute("rootpage")){
        TOROOT = ".";
    }else{
        TOROOT = "..";
    }
    String.prototype.replacerange = function(start,end,withstr){
        return this.substring(0,start)+withstr+this.substring(end);
    }
    let pn = location.pathname;
    let ra = /^.+\/([0-9]+)\.html$/gd.exec(pn);
    if(ra!==null){
        let pgno = Number(ra[1]);
        let lastpage = pn.replacerange(...ra.indices[1],(pgno-1).toString());
        let nextpage = pn.replacerange(...ra.indices[1],(pgno+1).toString());
        for(let e of document.getElementsByClassName("prevbtn")){
            e.onclick = function(){
                location.pathname = lastpage;
            }
            e.src = TOROOT+"/misc/prev.svg"
        }
        for(let e of document.getElementsByClassName("nextbtn")){
            e.onclick = function(){
                location.pathname = nextpage;
            }
            e.src = TOROOT+"/misc/next.svg"
        }
    }
    //Do not define earlier, otherwise we initialize Sentences before interactive is set
    customElements.define("w-sentence",SentenceElement);
    if(page.hasAttribute("size")){
        let size = Number(page.getAttribute("size"));
        if(!Number.isNaN(size)){
            WORDSIZE = size;
        }
        page.removeAttribute("size");
    }
    if(interactive){
        init_hover_popup();
        init_sidebar();
        init_dict();
        init_menu();
        onkeyup = function(e){
            if(!e.altKey)return;
            let k = e.key.toLowerCase();
            if(k=='s'){
                game.save_verbose(_storeto);
            }else if(k=='l'){
                game.load_verbose(_storeto);
                updateguesses();
            }else if(k=='r'){
                game.reset();
                updateguesses();
            }
        }
        onclick = function(e){
            if(e.target === page){
                sidebar.hide();
            }
        }
        game.load(_storeto);
        updatestats();
    }else{
        page.removeAttribute("noninteractive");
    }
    set_absolute_positions();
}
