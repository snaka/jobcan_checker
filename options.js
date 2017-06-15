(function($) {
  function restore_options() {
    console.log("restore options");
    chrome.storage.sync.get({
      companyId: '',
      email: '',
      password: ''
    }, function(items) {
      $("#company-id").val(items.companyId);
      $("#email").val(items.email);
      $("#password").val(items.password);
    });
  }

  function save_options() {
    console.log("save options");
    var new_option_values = {
      companyId: $("#company-id").val(),
      email: $("#email").val(),
      password: $("#password").val()
    };
    chrome.storage.sync.set(new_option_values, function() {
      var status = document.getElementById("status");
      status.textContent = "設定を保存しました"
      setTimeout(function() {
        status.textContent = "";
      }, 1000);
    });
  }

  $(document).on("unload", function(ev) {
    console.log("unload");
  });

  $("#save").on("click", save_options);

  $(document).ready(function() {
    console.log("ready");
    var version = chrome.runtime.getManifest().version;
    $("#ext-version").text("v" + version);
    restore_options();
  });

})(jQuery);

