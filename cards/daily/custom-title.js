(()=>{
  const chips=document.querySelector('.chips');
  const languageSelect=document.querySelector('#language');
  if(!chips||!languageSelect||document.querySelector('[data-value="Custom"]'))return;

  const goodDay=chips.querySelector('[data-value="Have a Good Day"]');
  const customButton=document.createElement('button');
  customButton.type='button';
  customButton.className='chip';
  customButton.dataset.value='Custom';
  customButton.textContent='Custom';
  customButton.setAttribute('aria-controls','customGreetingField');
  customButton.setAttribute('aria-expanded','false');
  (goodDay||chips.lastElementChild)?.insertAdjacentElement('afterend',customButton);

  const field=document.createElement('div');
  field.className='field';
  field.id='customGreetingField';
  field.hidden=true;
  field.innerHTML='<label for="customGreeting">Custom title</label><input id="customGreeting" maxlength="80" placeholder="Enter your title" autocomplete="off">';
  chips.insertAdjacentElement('afterend',field);
  const input=field.querySelector('#customGreeting');

  const useCustomTitle=()=>{
    greeting=input.value.trim()||'Your Title';
    document.querySelectorAll('.chip').forEach(chip=>chip.classList.toggle('active',chip===customButton));
    field.hidden=false;
    customButton.setAttribute('aria-expanded','true');
    autoArrange();
    render();
  };

  customButton.addEventListener('click',()=>{
    useCustomTitle();
    input.focus();
  });

  input.addEventListener('input',()=>{
    if(!customButton.classList.contains('active'))return;
    useCustomTitle();
  });

  document.querySelectorAll('.chip:not([data-value="Custom"])').forEach(button=>button.addEventListener('click',()=>{
    field.hidden=true;
    customButton.setAttribute('aria-expanded','false');
  }));

  const originalLanguageChange=languageSelect.onchange;
  languageSelect.onchange=event=>{
    if(!customButton.classList.contains('active')){
      originalLanguageChange?.call(languageSelect,event);
      return;
    }
    message.value=presets[event.target.value].m;
    useCustomTitle();
  };
})();
