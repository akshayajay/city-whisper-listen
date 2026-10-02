// District names: https://lokbhavan.tn.gov.in/districts-of-tamil-nadu/
// Coordinates are approximate district headquarters, never incident locations.
export const districts = [
 ['Chennai','சென்னை',13.08,80.27,'Madras'],
 ['Ariyalur','அரியலூர்',11.14,79.08],
 ['Chengalpattu','செங்கல்பட்டு',12.69,79.98,'Chengalpet','Tambaram'],
 ['Coimbatore','கோயம்புத்தூர்',11.02,76.96,'Kovai','கோவை'],
 ['Cuddalore','கடலூர்',11.75,79.77,'Chidambaram','சிதம்பரம்'],
 ['Dharmapuri','தருமபுரி',12.12,78.16,'தர்மபுரி'],
 ['Dindigul','திண்டுக்கல்',10.36,77.98,'Kodaikanal'],
 ['Erode','ஈரோடு',11.34,77.72],
 ['Kallakurichi','கள்ளக்குறிச்சி',11.74,78.96],
 ['Kancheepuram','காஞ்சிபுரம்',12.83,79.70,'Kanchipuram'],
 ['Kanyakumari','கன்னியாகுமரி',8.18,77.43,'Kanniyakumari','Nagercoil','நாகர்கோவில்'],
 ['Karur','கரூர்',10.96,78.08],
 ['Krishnagiri','கிருஷ்ணகிரி',12.53,78.21,'Hosur','ஓசூர்'],
 ['Madurai','மதுரை',9.93,78.12],
 ['Mayiladuthurai','மயிலாடுதுறை',11.10,79.65],
 ['Nagapattinam','நாகப்பட்டினம்',10.77,79.84,'Nagapattinam'],
 ['Namakkal','நாமக்கல்',11.22,78.17],
 ['Nilgiris','நீலகிரி',11.41,76.70,'The Nilgiris','Udhagamandalam','Udagamandalam','Ooty','ஊட்டி'],
 ['Perambalur','பெரம்பலூர்',11.23,78.88],
 ['Pudukkottai','புதுக்கோட்டை',10.38,78.82,'Pudukottai'],
 ['Ramanathapuram','ராமநாதபுரம்',9.37,78.83,'Rameswaram','இராமநாதபுரம்'],
 ['Ranipet','ராணிப்பேட்டை',12.93,79.33],
 ['Salem','சேலம்',11.66,78.15],
 ['Sivaganga','சிவகங்கை',9.84,78.48,'Karaikudi'],
 ['Tenkasi','தென்காசி',8.96,77.32],
 ['Thanjavur','தஞ்சாவூர்',10.79,79.14,'Tanjore','Kumbakonam','கும்பகோணம்'],
 ['Theni','தேனி',10.01,77.48],
 ['Thoothukudi','தூத்துக்குடி',8.80,78.15,'Tuticorin'],
 ['Tiruchirappalli','திருச்சிராப்பள்ளி',10.79,78.70,'Trichy','Tiruchi','திருச்சி'],
 ['Tirunelveli','திருநெல்வேலி',8.71,77.76,'Nellai','நெல்லை'],
 ['Tirupathur','திருப்பத்தூர்',12.50,78.57,'Tirupattur'],
 ['Tiruppur','திருப்பூர்',11.11,77.34,'Tirupur'],
 ['Tiruvallur','திருவள்ளூர்',13.14,79.91,'Thiruvallur'],
 ['Tiruvannamalai','திருவண்ணாமலை',12.23,79.07,'Thiruvannamalai'],
 ['Tiruvarur','திருவாரூர்',10.77,79.63,'Thiruvarur'],
 ['Vellore','வேலூர்',12.92,79.13],
 ['Viluppuram','விழுப்புரம்',11.94,79.49,'Villupuram'],
 ['Virudhunagar','விருதுநகர்',9.59,77.96,'Sivakasi'],
].map(([name,tamil,lat,lon,...aliases])=>({name,tamil,lat,lon,aliases:[name,tamil,...aliases]}));
const matches = (text, alias) => /[\u0B80-\u0BFF]/.test(alias) ? text.includes(alias) : new RegExp(`\\b${alias}\\b`, 'i').test(text);
export function locateTamilNadu(text, {indiaPublisher=false}={}) {
 const statewide = /\btamil\s*nadu\b|தமிழ்நாடு|தமிழக/.test(text.toLowerCase());
 const unambiguous = districts.filter(d=>d.aliases.some(a=>!['Salem','Erode'].includes(a) && matches(text,a)));
 const context = statewide || unambiguous.length>0 || indiaPublisher;
 const found = districts.filter(d=>unambiguous.includes(d) || (context && d.aliases.some(a=>matches(text,a))));
 if (!statewide && !found.length) return null;
 return {city:found.length===1?found[0].name:'Tamil Nadu', districts:found.map(d=>d.name), scope:found.length===1?'district mention':found.length>1?'multiple districts':'statewide mention'};
}
