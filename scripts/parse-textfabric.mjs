/**
 * @typedef {object} ParsedTextFabricFeature
 * @property {Record<string,string>} metadata
 * @property {Map<number,string>} values
 * @property {boolean} sparse
 */

/**
 * @typedef {Record<string,ParsedTextFabricFeature>} TextFabricFeatures
 */

/** @param {string} value @returns {string} */
function unescape(value){
  return value.replace(/\\t/g,'\t').replace(/\\n/g,'\n').replace(/\\\\/g,'\\');
}

/**
 * Parse a Text-Fabric node feature, preserving metadata and Unicode values.
 *
 * @param {string} text
 * @returns {ParsedTextFabricFeature}
 */
export function parseTextFabricFeature(text){
  /** @type {Record<string,string>} */
  const metadata={};
  /** @type {Map<number,string>} */
  const values=new Map();
  let node=1,sparse=false,dataStarted=false;
  for(const raw of String(text).replace(/^\uFEFF/,'').split(/\r?\n/)){
    if(raw.startsWith('@')){
      const equal=raw.indexOf('=');
      metadata[raw.slice(1,equal<0?undefined:equal)]=equal<0?'':raw.slice(equal+1);
      continue;
    }
    if(raw.startsWith('#!'))continue;
    if(!dataStarted&&!raw)continue;
    dataStarted=true;
    if(!raw&&!sparse){values.set(node++,'');continue}
    const match=raw.match(/^(\d+)(?:-(\d+))?\t([\s\S]*)$/);
    if(match){
      sparse=true;
      const start=Number(match[1]),end=Number(match[2]||match[1]),value=unescape(match[3]||'');
      for(let current=start;current<=end;current++)values.set(current,value);
    }else if(!sparse){
      values.set(node++,unescape(raw));
    }
  }
  return {metadata,values,sparse};
}

/**
 * Align required Text-Fabric features on their shared word nodes.
 *
 * @param {TextFabricFeatures} features
 * @param {string[]} required
 * @returns {Array<Record<string,string|number>>}
 */
export function alignTextFabricFeatures(features,required){
  const maps=required.map(name=>features[name]?.values);
  if(maps.some(map=>!map))throw Error(`Missing required Text-Fabric feature: ${required.find((_,index)=>!maps[index])}`);
  const firstMap=maps[0];
  if(!firstMap)throw Error('Missing first required Text-Fabric feature');
  const nodes=[...firstMap.keys()].filter(node=>maps.every(map=>map?.has(node)));
  if(!nodes.length)throw Error('Text-Fabric word features have no compatible node coverage');
  return nodes.map(node=>Object.fromEntries(required.map((name,index)=>[name,maps[index]?.get(node)??'']).concat([['node',node]])));
}
