const starts = "---M------**--*----M------------MM-M---M------------------------";
const base1 =  "TTTTTTTTTTTTTTTTCCCCCCCCCCCCCCCCAAAAAAAAAAAAAAAAGGGGGGGGGGGGGGGG";
const base2 =  "TTTTCCCCAAAAGGGGTTTTCCCCAAAAGGGGTTTTCCCCAAAAGGGGTTTTCCCCAAAAGGGG";
const base3 =  "TCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAGTCAG";

for(let i=0; i<64; i++) {
  if (starts[i] === 'M') console.log(base1[i]+base2[i]+base3[i]);
}
