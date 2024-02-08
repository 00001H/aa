export class Game{
    constructor(){
        this.reset();
        this.version = 2;
    }
    reset(){
        this._seen = new Set();
        this.guess = {};
    }
    translations(){
        return this.guess;
    }
    save_verbose(storage){
        this.save(storage);
        console.log("Saved",this.trcount(),"translation(s)");
    }
    save(storage){
        storage.setItem("gtrans",this.ddump());
    }
    load_verbose(storage){
        let anything_loaded = this.load(storage);
        if(anything_loaded){
            console.log("Loaded",this.trcount(),"translation(s)");
        }else{
            console.log("Nothing to load!");
        }
        return anything_loaded;
    }
    load(storage){
        let data = storage.getItem("gtrans");
        if(data === null){
            return false;
        }else{
            this.dload(data);
            return true;
        }
    }
    ddump(){
        return JSON.stringify({"guesses":this.guess,"seen":this.seen_array(),"version":this.version});
    }
    seen(){
        return this._seen;
    }
    seen_array(){
        return Array.from(this._seen);
    }
    dload(d){
        let data = JSON.parse(d);
        if(data.version !== this.version){
            console.warn("Game version change; loading might not work");
        }
        this.guess = data.guesses ?? {};
        this._seen = new Set(data.seen);
    }
    trcount(){
        return Object.keys(this.guess).length;
    }
    see(w){
        this._seen.add(w);
    }
    getguess(w){
        return this.guess[w] ?? "";
    }
    setguess(w,g){
        if(g.length === 0){
            delete this.guess[w];
        }else{
            this.guess[w] = g;
        }
    }
    getguessrich(w){
        w = this.getguess(w);
        if(w.length === 0){
            return "<span style='color:gray'>...</span>";
        }
        return w;
    }
}
