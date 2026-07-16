(()=>{
  const RECENT_POEMS=[
  {
    "book": "கொன்றை வேந்தன்",
    "author": "ஔவையார்",
    "number": "புதிய பதிவு 01",
    "text": "பூரியோர்க்கு இல்லை சீரிய ஒழுக்கம்",
    "meaning": "கொடியவர்களிடம் சிறந்த ஒழுக்கங்கள் இருக்காது.",
    "thought": "",
    "source": "recent-upload-2026-07-16"
  },
  {
    "book": "கொன்றை வேந்தன்",
    "author": "ஔவையார்",
    "number": "புதிய பதிவு 02",
    "text": "பெற்றோர்க்கு இல்லை சுற்றமும் சினமும்",
    "meaning": "ஞானம் பெற்றோர்க்கு சுற்றம் என்ற பந்தமும், கோபமும் கிடையாது.",
    "thought": "",
    "source": "recent-upload-2026-07-16"
  },
  {
    "book": "கொன்றை வேந்தன்",
    "author": "ஔவையார்",
    "number": "புதிய பதிவு 03",
    "text": "பேதைமை என்பது மாதர்க்கு அணிகலம்",
    "meaning": "அறியாதவர் போன்று இருப்பது பெண்களுக்கு அணிகலன்.",
    "thought": "",
    "source": "recent-upload-2026-07-16"
  },
  {
    "book": "கொன்றை வேந்தன்",
    "author": "ஔவையார்",
    "number": "புதிய பதிவு 04",
    "text": "பையச் சென்றால் வையந் தாங்கும்",
    "meaning": "நிதானமாகச் செய்யும் செயல்களில் வெற்றி நிச்சயம்.",
    "thought": "",
    "source": "recent-upload-2026-07-16"
  },
  {
    "book": "கொன்றை வேந்தன்",
    "author": "ஔவையார்",
    "number": "புதிய பதிவு 05",
    "text": "பொல்லாங்கு என்பவை எல்லாம் தவிர்",
    "meaning": "அனைத்துத் தீங்குகளையும் விட்டு விடு.",
    "thought": "",
    "source": "recent-upload-2026-07-16"
  },
  {
    "book": "கொன்றை வேந்தன்",
    "author": "ஔவையார்",
    "number": "புதிய பதிவு 06",
    "text": "போனகம் என்பது தானுழுது உண்ணல்",
    "meaning": "தான் முயன்று உழைத்து சம்பாதித்ததே உணவு என்பதாகும்.",
    "thought": "",
    "source": "recent-upload-2026-07-16"
  },
  {
    "book": "கொன்றை வேந்தன்",
    "author": "ஔவையார்",
    "number": "புதிய பதிவு 07",
    "text": "மருந்தே ஆயினும் விருந்தோடு உண்",
    "meaning": "தேவாம்ருதமே கிடைத்தாலும், பிறரோடு சேர்ந்து உண்.",
    "thought": "",
    "source": "recent-upload-2026-07-16"
  },
  {
    "book": "கொன்றை வேந்தன்",
    "author": "ஔவையார்",
    "number": "புதிய பதிவு 08",
    "text": "மாரி அல்லது காரியம் இல்லை",
    "meaning": "மழையின்றி ஒன்றும் இல்லை.",
    "thought": "",
    "source": "recent-upload-2026-07-16"
  },
  {
    "book": "கொன்றை வேந்தன்",
    "author": "ஔவையார்",
    "number": "புதிய பதிவு 09",
    "text": "மின்னுக்கு எல்லாம் பின்னுக்கு மழை",
    "meaning": "மழை வரப்போவதற்கு அறிகுறியே மின்னல்.",
    "thought": "",
    "source": "recent-upload-2026-07-16"
  },
  {
    "book": "கொன்றை வேந்தன்",
    "author": "ஔவையார்",
    "number": "புதிய பதிவு 10",
    "text": "மீகாமன் இல்லா மரக்கலம் ஓடாது",
    "meaning": "மாலுமி இல்லாத ஓடம் செல்லாது.",
    "thought": "",
    "source": "recent-upload-2026-07-16"
  },
  {
    "book": "கொன்றை வேந்தன்",
    "author": "ஔவையார்",
    "number": "புதிய பதிவு 11",
    "text": "முற்பகல் செய்யின் பிற்பகல் விளையும்",
    "meaning": "பிறருக்கு செய்யும் நன்மை, தீமைகள் பின்பு நமக்கே வரும்.",
    "thought": "",
    "source": "recent-upload-2026-07-16"
  },
  {
    "book": "கொன்றை வேந்தன்",
    "author": "ஔவையார்",
    "number": "புதிய பதிவு 12",
    "text": "மேழிச் செல்வம் கோழைப் படாது",
    "meaning": "கலப்பையால் உழைத்துச் சேர்த்த செல்வம் ஒரு போதும் வீண் போகாது.",
    "thought": "",
    "source": "recent-upload-2026-07-16"
  },
  {
    "book": "கொன்றை வேந்தன்",
    "author": "ஔவையார்",
    "number": "புதிய பதிவு 13",
    "text": "மொழிவது மறுக்கின் அழிவது கருமம்",
    "meaning": "பெரியோர் சொல்லை கேளாமல் மறுத்தால் அந்த காரியங்கள் கெட்டுவிடும்.",
    "thought": "",
    "source": "recent-upload-2026-07-16"
  },
  {
    "book": "கொன்றை வேந்தன்",
    "author": "ஔவையார்",
    "number": "புதிய பதிவு 14",
    "text": "மோனம் என்பது ஞான வரம்பு",
    "meaning": "மௌனமே மெய்ஞ்ஞானத்தின் எல்லை.",
    "thought": "",
    "source": "recent-upload-2026-07-16"
  },
  {
    "book": "கொன்றை வேந்தன்",
    "author": "ஔவையார்",
    "number": "புதிய பதிவு 15",
    "text": "வளவன் ஆயினும் அளவு அறிந்து அழித்து உண்",
    "meaning": "சோழ வளவனை ஒத்த செல்வம் படைத்திருந்தாலும், வரவு அறிந்து செலவு செய்து உண்ண வேண்டும்.",
    "thought": "",
    "source": "recent-upload-2026-07-16"
  },
  {
    "book": "கொன்றை வேந்தன்",
    "author": "ஔவையார்",
    "number": "புதிய பதிவு 16",
    "text": "வானம் சுருங்கின் தானம் சுருங்கும்",
    "meaning": "மழை குறைந்து விடுமானால் பல தான தர்மங்கள் குறைந்து விடும்.",
    "thought": "",
    "source": "recent-upload-2026-07-16"
  },
  {
    "book": "கொன்றை வேந்தன்",
    "author": "ஔவையார்",
    "number": "புதிய பதிவு 17",
    "text": "வீரன் கேண்மை கூர் அம்பாகும்",
    "meaning": "வீரனுடன் கூடிய நட்பு, கையில் கூர்மையான அம்பை வைத்திருப்பதற்கு ஒப்பாகும்.",
    "thought": "",
    "source": "recent-upload-2026-07-16"
  },
  {
    "book": "கொன்றை வேந்தன்",
    "author": "ஔவையார்",
    "number": "புதிய பதிவு 18",
    "text": "உரவோர் என்கை இரவாது இருத்தல்",
    "meaning": "யாசிக்காமல் இருப்பதே வல்லவர்க்கு இலக்கணம்.",
    "thought": "",
    "source": "recent-upload-2026-07-16"
  },
  {
    "book": "கொன்றை வேந்தன்",
    "author": "ஔவையார்",
    "number": "புதிய பதிவு 19",
    "text": "ஊக்கம் உடைமை ஆக்கத்திற்கு அழகு",
    "meaning": "உற்சாகமான முயற்சியோடு இருப்பதே முன்னேற்றத்திற்கு அழகு.",
    "thought": "",
    "source": "recent-upload-2026-07-16"
  },
  {
    "book": "கொன்றை வேந்தன்",
    "author": "ஔவையார்",
    "number": "புதிய பதிவு 20",
    "text": "வெள்ளைக்கு இல்லை கள்ளச் சிந்தை",
    "meaning": "தூய்மையான மனமுள்ளோருக்கு, வஞ்சக எண்ணம் இல்லை.",
    "thought": "",
    "source": "recent-upload-2026-07-16"
  },
  {
    "book": "கொன்றை வேந்தன்",
    "author": "ஔவையார்",
    "number": "புதிய பதிவு 21",
    "text": "வேந்தன் சீறின் ஆம்துணை இல்லை",
    "meaning": "அரசின் கோபத்துக்கு ஆளானவருக்கு வேறு துணை இல்லை.",
    "thought": "",
    "source": "recent-upload-2026-07-16"
  }
];
  const isMarimuthuPage=()=>/^\/marimuthu(?:\/|$)/i.test(location.pathname);
  const normalize=value=>String(value||'').normalize('NFC').replace(/\s+/g,' ').trim().replace(/[.।]+$/u,'');
  const apply=()=>{
    if(!isMarimuthuPage()||typeof poems==='undefined'||!Array.isArray(poems))return;
    const existing=new Set(poems.map(poem=>`${normalize(poem.book)}|${normalize(poem.text)}`));
    const additions=RECENT_POEMS.filter(poem=>{
      const key=`${normalize(poem.book)}|${normalize(poem.text)}`;
      if(existing.has(key))return false;
      existing.add(key);
      return true;
    });
    poems.push(...additions);

    if(typeof render==='function'&&typeof index!=='undefined'){
      if(!globalThis.__marimuthuOptionalThoughtRender){
        const baseRender=render;
        render=function(){
          baseRender();
          const current=poems[index];
          const thoughtSection=document.querySelector('.thought');
          if(thoughtSection)thoughtSection.hidden=!String(current?.thought||'').trim();
        };
        globalThis.__marimuthuOptionalThoughtRender=true;
      }

      const query=new URLSearchParams(location.search);
      const book=query.get('book');
      const number=query.get('poem');
      const selected=number?poems.findIndex(poem=>poem.number===number&&(!book||poem.book===book)):-1;
      if(selected>=0)index=selected;
      else if(!book&&!number)index=(new Date().getDate()-1)%poems.length;
      render();
    }
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});
  else apply();
})();
