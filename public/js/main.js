/* eslint-disable func-names, no-undef */
/* eslint-env jquery, browser */
// eslint-disable-next-line no-unused-vars
Dropzone.prototype._uploadData = (files, dataBlocks) => {
  // Monkey-patch default uploading with custom validation & processing.
  console.log('Beginning processing...');
  const reader = new FileReader();
  // eslint-disable-next-line no-use-before-define
  reader.onload = validate;
  reader.readAsArrayBuffer(files[0]);
};

function showlog(type, area, message) {
  // Show either a success log or an error log on either the upload or full form box.
  // Type can be one of success or fail
  // Area can be one of upload or form
  console.log(`Showing log with message: ${message}`);
  const selector = `.${area} .log#${type}`;
  if (type === 'success') {
    // $(`.${selector} pre`).text(message);
  } else {
    $(`${selector} pre`).text(message);
  }
  $(selector).addClass('show');
}

let isOpen = false;
// Manage opening and closing of step 2
function openStepTwo() {
  if (isOpen) { console.log('Not opening StepTwo'); return; }
  console.log('Opening StepTwo');
  $('#step2').animate({ opacity: 1, height: 'toggle' }, 250);
  isOpen = true;
}

function closeStepTwo() {
  if (!isOpen) { console.log('Not closing StepTwo'); return; }
  console.log('Closing StepTwo');
  $('#step2').animate({ opacity: 0, height: 'toggle' }, 250);
  isOpen = false;
}

$(document).ready(() => {
  // Create dropzone form
  $('#upload-zone').dropzone({
    url: '/upload',
    maxFilesize: 2, // MB
    acceptedFiles: '.csv,.xls,.xlsx',
    autoProcessQueue: true,
    maxFiles: 1,
    previewTemplate: `
    <div class='dz-details row text-left'>
      <div class="col-6 dz-detail dz-name" data-dz-name></div>
      <div class="col-4 dz-detail dz-size" data-dz-size></div>
      <div class="col-2"><a class="btn btn-danger btn-large btn-link dz-remove" href="javascript:undefined;" data-dz-remove="">Delete</a></div>
      </div>
    <div class="dz-error-message"><span data-dz-errormessage></span></div>
    <div class="dz-success-mark"><span>✔</span></div>
    <div class="dz-error-mark"><span>✘</span></div>
    <div class="float-left dz-progress"><span class="dz-upload" data-dz-uploadprogress></span></div>
    <div class="float-left"></div>
    <div class="float-left"></div>
    `,
    init() {
      const dz = this;
      // Source: https://stackoverflow.com/a/35275260
      // for Dropzone to process the queue (instead of default form behavior):
      $('#submit-all').on('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dz.processQueue();
      });
      // send all the form data along with the files:
      this.on('sendingmultiple', (data, xhr, formData) => {
        formData.append('firstname', $('#firstname').val());
        formData.append('lastname', $('#lastname').val());
      });

      // Source: https://stackoverflow.com/a/26035954/3902950
      this.on('maxfilesexceeded', function (file) {
        console.log('User adding new file, remove existing.');

        this.removeAllFiles(true);
        this.addFile(file);
      });

      // Clear validation on new file
      this.on('removedfile', () => {
        if (this.files.length > 0) { return; }
        $('.log').removeClass('show');
        $('.log pre').text('');
      });

      // Show error and remove file on error
      this.on('error', (e, msg) => {
        if (e.status !== 'error') {return;}
        console.log('An error occured!');
        console.log(e);
        showlog('error', 'upload', msg);
        // Remove other file if it exists
        if (this.files.length > 1) {
          this.removeFile(this.files[0]);
        }
        // Close StepTwo
        closeStepTwo();
      })

      // Show next step when files added
      this.on('maxfilesreached', openStepTwo);
      this.on('removedfile', closeStepTwo);
    }
  });

  // Date Time Picker from https://demos.creative-tim.com/material-kit/docs/2.1/plugins/datetimepicker.html
  $('.datetimepicker').datetimepicker({
    icons: {
      time: 'mi mi-access-time',
      date: 'mi mi-today',
      up: 'mi mi-chevron-left mi-chevron-rotate',
      down: 'mi mi-chevron-right mi-chevron-rotate',
      previous: 'mi mi-chevron-left',
      next: 'mi mi-chevron-right',
      today: 'mi mi-today',
      clear: 'mi mi-trash',
      close: 'mi mi-remove'
    }
  });

  // Hide step 2 using JavaScript (so that it remains visible without JS)
  $('#step2').animate({ opacity: 1, height: 'toggle' }, 0);
});

function validate(e) {
  try {
    console.log('Loading workbook..')
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });

    // Confirm workbook has data
    if ($.isEmptyObject(workbook.Sheets)) {
      // Workbook is empty!
      showlog('error', 'upload', 'The file you uploaded is either invalid or an empty spreadsheet!\nMake sure the file is one of the following:\n - Excel Spreadsheets (xls,xlsx,xlsxm, etc)\n - Delimiter-Separated Values (CSV/TXT)\n - OpenDocument Spreadsheet (ODS)\n - Any other common spreadsheet file.');
      return;
    }

    console.log('Workbook found! Processing...');
    console.log(workbook);
    const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets.Sheet1);
    console.log('Converted to JSON object.');
    console.log(sheetData);
    console.log('Confirming data is valid');
    
  } catch (error) {
    // Processing failed for uncatched reason. Log the error and show it to the user.
    console.log('Loading failed!');
    console.log(error);
    showlog('error', 'upload', error);
  }
}
