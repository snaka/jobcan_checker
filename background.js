(function ($) {
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
      // for test
      // statuses = [{title: "status1", count: 1}];
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
        message: notificationMessage,
        buttons: [{ title: "ジョブカンを開く" }]
      }
    );
    chrome.notifications.onButtonClicked.addListener(function() {
      openJobcanPage();
    });
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
      openJobcanPage();
    });
  }

  function openJobcanPage() {
    chrome.tabs.create({ url: "https://ssl.jobcan.jp/employee" });
  }

  /*
   * バッジの更新
   */
  function updateBadge(data) {
    var totalCount = calcTotalCount(data);
    if (totalCount > 0) {
      chrome.browserAction.setBadgeText({ text: totalCount.toString() });
      chrome.browserAction.setBadgeBackgroundColor({ color: "#ff0000" });
    }
    else {
      // 0 の場合はバッジを消す
      chrome.browserAction.setBadgeText({ text: "" });
    }
  }

  function calcTotalCount(data) {
    var totalCount = 0;
    for (var status of data) {
      totalCount = totalCount + status.count;
    }
    return totalCount;
  }

  function showErrorBadge() {
    chrome.browserAction.setBadgeText({ text: "?" });
    chrome.browserAction.setBadgeBackgroundColor({ color: "#aaaaaa" });
  }

  /*
   * 打刻エラー以外は通知なしでチェック
   */
  function checkSilently() {
    loadJobcanPage()
    .done(function(data) {
      updateBadge(data);
      if (calcTotalCount(data) > 0) {
        notify(data);
      }
    })
    .fail(function(message) {
      showErrorBadge();
    });
  }

  /*
   * 強制的にチェック（通知あり）
   */
  chrome.browserAction.onClicked.addListener(function(tab) {
    loadJobcanPage()
    .done(function(data) {
      updateBadge(data);
      notify(data);
    })
    .fail(function(message) {
      showErrorBadge();
      notifyError(message);
    });
  });

  chrome.alarms.onAlarm.addListener(function(alarm) {
    checkSilently();
  });

  chrome.alarms.create({ periodInMinutes: 30 });
  checkSilently();
})(jQuery);
