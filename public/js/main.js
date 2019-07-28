/* eslint-disable func-names */
/* eslint-env jquery, browser */
$(document).ready(() => {

  // Create dropzone form
  $('form#upload-zone').dropzone({
    url: '/upload',
    maxFilesize: 2, // MB
    acceptedFiles: '.csv,.xls,.xlsx',
    autoProcessQueue: false,
    maxFiles: 1,
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
    }
  });

});
