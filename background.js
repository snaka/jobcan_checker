(function ($) {
  var jobcan_login_url = "https://ssl.jobcan.jp/login/pc-employee";

  function loadJobcanPage() {
    console.log("loadJobcanPage");

    var dInner = new $.Deferred();

    var promise = $.ajax({
      type: "GET",
      url: "https://ssl.jobcan.jp/employee/index/load-top-informations"
    });
    promise.done(function(data) {
      if (!isLogin(data)) {
        dInner.reject("ジョブカンにログインしてください");
        return;
      }
      html = $.parseHTML($.trim(data.tpl));
      statusTable = html[2];
      statuses = [];
      $(statusTable).find("tr").each(function(i) {
        var statusName = $(this).children("th").text();
        var statusCountText = $(this).children("td").text();
        var statusCount = Number.parseInt(statusCountText);
        console.log(statusName + ":" + statusCount);
        statuses.push({ title: statusName, count: statusCount });
      });
      dInner.resolve(statuses);
    });

    return dInner.promise();
  }

  function isLogin(data) {
    // ログイン済みであればjsonが返ってくる
    if (typeof data === "object") {
      return true;
    }
    return false;
  }

  /*
   * デスクトップ通知
   */
  function notify(data) {
    // data: [ { title: "xxxx", count: 0 }, { title: "yyyy", count: 1 } ]
    var notificationMessage = data.map(function(x) {
      return x.title + ":" + x.count;
    }).join("\n");

    chrome.notifications.create(
      "jobcanChecker.showStatus", {
        type: "basic",
        iconUrl: "images/icon.png",
        title: "ジョブカンエラー状況",
        message: notificationMessage
      }
    );
  }

  /*
   * エラー通知
   */
  function notifyError(msg) {
    chrome.notifications.create(
      "jobcanChecker.showError", {
        type: "basic",
        iconUrl: "images/icon.png",
        title: "ジョブカン連携失敗",
        message: msg,
        buttons: [{ title: "ジョブカンを開く" }]
      }
    );
    chrome.notifications.onButtonClicked.addListener(function() {
      chrome.notifications.clear("jobcanChecker.showError");
      chrome.tabs.create({ url: "https://ssl.jobcan.jp/employee" });
    });
  }

  function updateBadge(data) {
    var totalCount = 0;
    for (var status of data) {
      totalCount = totalCount + status.count;
    }
    chrome.browserAction.setBadgeText({ text: totalCount.toString() });

    var bgColor = "#aaaaaa";
    if (totalCount > 0) {
      bgColor = "#ff0000";
    }
    chrome.browserAction.setBadgeBackgroundColor({ color: bgColor });
  }

  chrome.browserAction.onClicked.addListener(function(tab) {
    loadJobcanPage()
    .done(function(data) {
      updateBadge(data);
      notify(data);
    })
    .fail(function(message) {
      notifyError(message);
    });
  });

  chrome.alarms.onAlarm.addListener(function(alarm) {
    console.log("alarm");
  });

  chrome.alarms.create({ periodInMinutes: 30 });
  loadJobcanPage()
})(jQuery);
