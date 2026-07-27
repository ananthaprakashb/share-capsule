(()=>{
  const mount=document.getElementById('contribute');
  if(!mount)return;
  const style=document.createElement('style');
  style.textContent=`
    .contribute{margin-top:28px;padding:24px;border-radius:26px;background:linear-gradient(145deg,#3e241a,#7a2e20);color:#fff;box-shadow:var(--shadow)}
    .contribute h2{margin:0;font-size:clamp(28px,5vw,42px);letter-spacing:-.045em;line-height:1}
    .contributeIntro{margin:12px 0 0;max-width:820px;color:rgba(255,255,255,.84);font-size:14px;line-height:1.6}
    .contributeRules{display:flex;flex-wrap:wrap;gap:7px;margin:15px 0 0;padding:0;list-style:none}.contributeRules li{padding:7px 9px;border-radius:999px;background:rgba(255,255,255,.1);font-size:11px;font-weight:850}
    .contributeForm{display:grid;grid-template-columns:1fr 1fr;gap:13px;margin-top:20px}.contributeField{display:grid;gap:6px}.contributeField.wide{grid-column:1/-1}.contributeField label{font-size:11px;font-weight:900;letter-spacing:.07em;text-transform:uppercase}.contributeField input,.contributeField textarea{width:100%;border:1px solid rgba(255,255,255,.24);border-radius:14px;background:rgba(255,255,255,.96);color:#24150e;padding:12px 13px;outline:none;resize:vertical}.contributeField input:focus,.contributeField textarea:focus{box-shadow:0 0 0 3px rgba(255,255,255,.24)}
    .contributeHelp{font-size:10px;color:rgba(255,255,255,.68);line-height:1.4}.contributeTrap{position:absolute!important;left:-9999px!important;width:1px!important;height:1px!important;overflow:hidden!important}
    .contributeConsent{grid-column:1/-1;display:flex;gap:9px;align-items:flex-start;font-size:12px;line-height:1.45;color:rgba(255,255,255,.84)}.contributeConsent input{margin-top:3px}
    .contributeActions{grid-column:1/-1;display:flex;gap:10px;align-items:center;flex-wrap:wrap}.contributeSubmit{min-height:48px;border:0;border-radius:14px;padding:0 18px;background:#fff;color:#7a2e20;font-weight:950}.contributeStatus{font-size:12px;font-weight:800}.contributeMail{color:#fff;font-weight:900}
    @media(max-width:650px){.contributeForm{grid-template-columns:1fr}.contributeField.wide,.contributeConsent,.contributeActions{grid-column:auto}}
  `;
  document.head.appendChild(style);
  mount.className='contribute';
  mount.innerHTML=`
    <h2>Help document your hometown’s story</h2>
    <p class="contributeIntro">Know the history behind a Tamil Nadu place name? Fill in the details below. When you tap the review button, your email app will open with everything addressed to <a class="contributeMail" href="mailto:editor@sharecapsule.app">editor@sharecapsule.app</a>. Review the message and send it from your email account.</p>
    <ul class="contributeRules"><li>Use official or published sources</li><li>Include links or document details</li><li>Separate tradition from proven history</li><li>No unsupported claims</li></ul>
    <form id="placeContributionForm" class="contributeForm" novalidate>
      <div class="contributeField"><label for="placeName">Place name *</label><input id="placeName" name="placeName" maxlength="120" required autocomplete="off"></div>
      <div class="contributeField"><label for="district">District *</label><input id="district" name="district" maxlength="120" required autocomplete="off"></div>
      <div class="contributeField wide"><label for="historyDetails">Name history and historical details *</label><textarea id="historyDetails" name="historyDetails" rows="7" minlength="80" maxlength="5000" required placeholder="Explain the origin of the name, older names, dates, dynasties, inscriptions, literature, archaeology, and any uncertainty."></textarea><span class="contributeHelp">Minimum 80 characters. Clearly label oral tradition, temple legend, or disputed interpretation.</span></div>
      <div class="contributeField wide"><label for="referencesText">References and proof *</label><textarea id="referencesText" name="referencesText" rows="5" maxlength="3500" required placeholder="Book title and author, inscription number, government department, excavation report, gazetteer, journal article, or archive record."></textarea></div>
      <div class="contributeField wide"><label for="proofLinks">Proof links</label><textarea id="proofLinks" name="proofLinks" rows="3" maxlength="2500" placeholder="One official or reputable http/https link per line."></textarea><span class="contributeHelp">Links will be included in the email for editorial verification.</span></div>
      <div class="contributeField"><label for="contributorName">Your name</label><input id="contributorName" name="contributorName" maxlength="120" autocomplete="name"></div>
      <div class="contributeField"><label for="contributorEmail">Your email</label><input id="contributorEmail" name="contributorEmail" type="email" maxlength="254" autocomplete="email"><span class="contributeHelp">Included in the email so the editor can contact you for clarification.</span></div>
      <div class="contributeTrap" aria-hidden="true"><label for="website">Website</label><input id="website" name="website" tabindex="-1" autocomplete="off"></div>
      <label class="contributeConsent"><input id="contributionConsent" type="checkbox" required> <span>I confirm that this is submitted in good faith, that references are provided, and that Share Capsule may edit, verify, publish, reject, or remove the material.</span></label>
      <div class="contributeActions"><button class="contributeSubmit" type="submit">Open email for editorial review</button><span id="contributeStatus" class="contributeStatus" role="status" aria-live="polite"></span></div>
    </form>`;

  const form=document.getElementById('placeContributionForm');
  const status=document.getElementById('contributeStatus');
  const normalized=value=>String(value??'').normalize('NFC').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,'').trim();
  form.addEventListener('submit',event=>{
    event.preventDefault();
    status.textContent='';
    if(!form.reportValidity())return;
    const data=Object.fromEntries(new FormData(form).entries());
    const payload={
      placeName:normalized(data.placeName),district:normalized(data.district),historyDetails:normalized(data.historyDetails),referencesText:normalized(data.referencesText),proofLinks:normalized(data.proofLinks),contributorName:normalized(data.contributorName),contributorEmail:normalized(data.contributorEmail),website:normalized(data.website)
    };
    if(payload.website)return;
    if(payload.historyDetails.length<80){status.textContent='Please add more historical detail.';return}
    const subject=`Place history submission: ${payload.placeName}`;
    const body=[
      'PLACE HISTORY SUBMISSION',
      '',
      `Place name: ${payload.placeName}`,
      `District: ${payload.district}`,
      '',
      'Name history and historical details:',
      payload.historyDetails,
      '',
      'References and proof:',
      payload.referencesText,
      '',
      'Proof links:',
      payload.proofLinks||'(none provided)',
      '',
      `Contributor name: ${payload.contributorName||'(not provided)'}`,
      `Contributor email: ${payload.contributorEmail||'(not provided)'}`,
      '',
      'Consent: Submitted in good faith. Share Capsule may edit, verify, publish, reject, or remove this material.',
      '',
      `Submitted from: ${location.href}`
    ].join('\n');
    status.textContent='Opening your email app…';
    location.href=`mailto:editor@sharecapsule.app?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setTimeout(()=>{status.textContent='Your email app should open with the details filled in. Review and press Send.'},900);
  });
})();