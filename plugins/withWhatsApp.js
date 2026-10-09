const {withAndroidManifest}=require('expo/config-plugins');
module.exports=config=>withAndroidManifest(config,config=>{
 const manifest=config.modResults.manifest;
 manifest.queries=manifest.queries||[];
 if(!manifest.queries.some(q=>(q.intent||[]).some(i=>(i.data||[]).some(d=>d.$?.['android:scheme']==='whatsapp'))))manifest.queries.push({intent:[{action:[{$:{'android:name':'android.intent.action.VIEW'}}],data:[{$:{'android:scheme':'whatsapp'}}]}]});
 return config;
});
