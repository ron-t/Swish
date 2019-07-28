/* eslint-disable func-names */
/* eslint-env jquery, browser */
$(document).ready(() => {

  // Create dropzone form
  $('#upload-zone').dropzone({
    url: '/upload',
    maxFilesize: 2, // MB
    acceptedFiles: '.csv,.xls,.xlsx',
    autoProcessQueue: false,
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
        this.removeAllFiles();
        this.addFile(file);
      });

      // Show next step when files added
      this.on('maxfilesreached', () => { $('#step2').animate({opacity: 1, height: 'toggle' }, 250); });
      this.on('removedfile', () => { $('#step2').animate({ opacity: 0, height: 'toggle' }, 250); });
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
