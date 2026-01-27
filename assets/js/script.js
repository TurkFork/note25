    const noteArea = document.getElementById('noteArea');
    const saveStatus = document.getElementById('saveStatus');
    const noteList = document.getElementById('noteList');

    let notes = JSON.parse(localStorage.getItem('notes')) || {};
    if (!notes['Welcome to Note25']) {
      notes['Welcome to Note25'] = `
        <p>👋 Welcome to <strong>Note25</strong>!</p>
        <ul>
          <li>Use the <b>toolbar</b> above to format your text</li>
          <li>Click <b>+ New Note</b> to create as many notes as you want</li>
          <li>Click the 🗑️ icon to delete a note</li>
          <li>Everything is saved automatically in your browser</li>
        </ul>
        <p>Happy writing!</p>`;
      localStorage.setItem('notes', JSON.stringify(notes));
    }
    let currentNote = notes['Welcome to Note25'] ? 'Welcome to Note25' : Object.keys(notes)[0] || 'Untitled Note';

    function loadNoteList() {
      noteList.innerHTML = '';
      Object.keys(notes).forEach(title => {
        const li = document.createElement('li');
        li.textContent = title;
        li.onclick = () => {
          currentNote = title;
          noteArea.innerHTML = notes[title];
          document.getElementById('currentNoteTitle').textContent = title;
          highlightSelected(li);
        };

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑️';
        deleteBtn.style.marginLeft = '5px';
        deleteBtn.style.fontSize = '0.7rem';
        deleteBtn.style.padding = '0.1rem 0.3rem';

        const renameBtn = document.createElement('button');
        renameBtn.textContent = '✏️';
        renameBtn.style.marginLeft = '5px';
        renameBtn.style.fontSize = '0.7rem';
        renameBtn.style.padding = '0.1rem 0.3rem';

        renameBtn.onclick = (e) => {
          e.stopPropagation();
          const newTitle = prompt('Rename note to:', title);
          if (newTitle && newTitle !== title && !notes[newTitle]) {
            notes[newTitle] = notes[title];
            delete notes[title];
            if (currentNote === title) {
              currentNote = newTitle;
            }
            localStorage.setItem('notes', JSON.stringify(notes));
            loadNoteList();
            noteArea.innerHTML = notes[currentNote];
            document.getElementById('currentNoteTitle').textContent = currentNote;
          }
        };

        deleteBtn.onclick = (e) => {
          e.stopPropagation();
          if (confirm(`Delete "${title}"?`)) {
            delete notes[title];
            if (currentNote === title) {
              const first = Object.keys(notes)[0] || 'Untitled Note';
              notes[first] = notes[first] || '';
              currentNote = first;
              noteArea.innerHTML = notes[first];
              document.getElementById('currentNoteTitle').textContent = currentNote;
            }
            localStorage.setItem('notes', JSON.stringify(notes));
            loadNoteList();
          }
        };

        li.appendChild(renameBtn);
        li.appendChild(deleteBtn);
        noteList.appendChild(li);
      });
    }

    function highlightSelected(selectedLi) {
      [...noteList.children].forEach(li => li.style.fontWeight = 'normal');
      if(selectedLi) selectedLi.style.fontWeight = 'bold';
    }

    function createNewNote() {
      const title = prompt('Enter note title');
      if (title && !notes[title]) {
        notes[title] = '';
        currentNote = title;
        noteArea.innerHTML = '';
        localStorage.setItem('notes', JSON.stringify(notes));
        loadNoteList();
        document.getElementById('currentNoteTitle').textContent = currentNote;
        highlightSelected([...noteList.children].find(li => li.textContent.startsWith(currentNote)));
      }
    }

    function formatText(command, value = null) {
      document.execCommand(command, false, value);
      if (command === 'fontName') {
        noteArea.style.fontFamily = value;
      }
    }

    function htmlToMarkdown(html) {
      // Basic converter for bold, italics, underline, and line breaks
      let md = html;

      // Replace bold tags
      md = md.replace(/<b>(.*?)<\/b>/gi, '**$1**');
      md = md.replace(/<strong>(.*?)<\/strong>/gi, '**$1**');

      // Replace italic tags
      md = md.replace(/<i>(.*?)<\/i>/gi, '*$1*');
      md = md.replace(/<em>(.*?)<\/em>/gi, '*$1*');

      // Replace underline (no standard in markdown, use _text_)
      md = md.replace(/<u>(.*?)<\/u>/gi, '_$1_');

      // Replace strikethrough
      md = md.replace(/<s>(.*?)<\/s>/gi, '~~$1~~');
      md = md.replace(/<strike>(.*?)<\/strike>/gi, '~~$1~~');

      // Replace <br> with newlines
      md = md.replace(/<br\s*\/?>/gi, '\n');

      // Remove any remaining HTML tags
      md = md.replace(/<\/?[^>]+(>|$)/g, '');

      return md;
    }

    function exportNote() {
      const formatSelect = document.getElementById('exportFormat');
      const format = formatSelect.value || 'txt';
      let content = '';
      let filename = currentNote.replace(/\s+/g, '_');

      if (format === 'txt') {
        content = noteArea.innerText || noteArea.textContent || '';
        filename += '.txt';
      } else if (format === 'html') {
        content = `

<body>${noteArea.innerHTML}</body></html>`;
        filename += '.html';
      } else if (format === 'md') {
        content = htmlToMarkdown(noteArea.innerHTML);
        filename += '.md';
      } else {
        content = noteArea.innerText || noteArea.textContent || '';
        filename += '.txt';
      }

      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }

    function triggerImport() {
      const input = document.getElementById('importFileInput');
      input.value = null;
      input.click();
    }

    document.getElementById('importFileInput').addEventListener('change', function(event) {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(e) {
        const text = e.target.result;
        let title = file.name.replace(/\.txt$/i, '');
        if (notes[title]) {
          let suffix = 1;
          while (notes[title + '_' + suffix]) suffix++;
          title = title + '_' + suffix;
        }
        notes[title] = text.replace(/\n/g, '<br>');
        currentNote = title;
        noteArea.innerHTML = notes[title];
        localStorage.setItem('notes', JSON.stringify(notes));
        loadNoteList();
        document.getElementById('currentNoteTitle').textContent = currentNote;
        highlightSelected([...noteList.children].find(li => li.textContent.startsWith(currentNote)));
      };
      reader.readAsText(file);
    });

    noteArea.innerHTML = notes[currentNote] || '';
    document.getElementById('currentNoteTitle').textContent = currentNote;
    noteArea.addEventListener('input', () => {
      notes[currentNote] = noteArea.innerHTML;
      localStorage.setItem('notes', JSON.stringify(notes));
      saveStatus.textContent = 'All changes saved.';
    });

    loadNoteList();
    document.getElementById('currentNoteTitle').textContent = currentNote;
    highlightSelected([...noteList.children].find(li => li.textContent.startsWith(currentNote)));