// Removes uploaded mp4 assets nothing references any more. Clips live on Vimeo now.
import {createClient} from '@sanity/client'
const client = createClient({projectId:'q198rjlt',dataset:'production',token:process.env.T,apiVersion:'2025-02-19',useCdn:false})
const orphans = await client.fetch('*[_type=="sanity.fileAsset" && count(*[references(^._id)]) == 0]{_id,originalFilename,size}')
const mb = (orphans.reduce((a,o)=>a+(o.size||0),0)/1048576).toFixed(0)
console.log(`${orphans.length} unreferenced mp4s, ${mb}MB`)
if (process.argv.includes('--dry')) process.exit(0)
for (let i=0;i<orphans.length;i+=25){
  const tx = client.transaction()
  orphans.slice(i,i+25).forEach(o=>tx.delete(o._id))
  await tx.commit()
  console.log(`  deleted ${Math.min(i+25,orphans.length)}/${orphans.length}`)
}
