(function ($) {
  class Jobcan {
    constructor() {
      console.log("Jobcan constructor");
    }

    /*
     * ログイン
     */
    login() {
      console.log("jobcan login");

      return this._getLoginInfo().then((loginInfo) => {
        return $.post("https://ssl.jobcan.jp/login/pc-employee", {
          client_id: loginInfo.companyId,
          email: loginInfo.email,
          password: loginInfo.password,
          save_login_info: "1",
          url: "/employee",
          login_type: "1"
        });
      }).catch(() => console.log("login failed."));
    }

    /*
     * ジョブカンページ取得
     *
     * @return 
     */
    loadJobcanPage() {
      console.log("loadJobcanPage");

      let promise = Promise.resolve(
        $.ajax({
          type: "GET",
          url: "https://ssl.jobcan.jp/employee/index/load-top-informations"
        })
      ); 
      return promise.then((data) => {
        console.log(data);
        /*
        if (!this.isLogin(data)) {
          // dInner.reject("ジョブカンにログインしてください");
          this
            .login()
            .then(() => Promise.resolve({}))
            .catch(() => Promise.reject("ログインできませんでした"));
          return;
        }
        */
        let html = $.parseHTML($.trim(data.tpl));
        let statusTable = html[2];
        let statuses = [];
        if (typeof statusTable == 'undefined') {
          return Promise.reject(new Error("情報が取得できませんでした"))
        }
        console.log("statusTable: " + statusTable);
        statusTable.querySelectorAll("tr").forEach((tr) => {
          let statusName = $(tr).children("th").text();
          let statusCountText = $(tr).children("td").text();
          let statusCount = Number.parseInt(statusCountText);
          console.log(statusName + ":" + statusCount);
          statuses.push({ title: statusName, count: statusCount });
        });
        // for test
        // statuses = [{title: "status1", count: 1}];
        return statuses;
      });
    }

    /*
     * ログイン情報取得
     */
    _getLoginInfo() {
      return new Promise((resolve, reject) => {
        chrome.storage.sync.get({
          companyId: "",
          email: "",
          password: ""
        }, (items) => {
          resolve(items);
        });
      }).catch(() => console.log("get login information failed."));
    }

    /*
     * ジョブカンページをタブで開く
     */
    openJobcanPage() {
      chrome.tabs.create({ url: "https://ssl.jobcan.jp/employee" });
    }

    /*
     * ログインしているか?
     */
    isLogin(data) {
      // ログイン済みであればjsonが返ってくる
      if (typeof data === "object") {
        return true;
      }
      return false;
    }
  }

  /*
   * デスクトップ通知
   */
  function notify(data) {
    // data: [ { title: "xxxx", count: 0 }, { title: "yyyy", count: 1 } ]
    console.log("notify data :" + data);
    var notificationMessage = data.map((x) => {
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
        buttons: [{ title: "オプションを開く" }, { title: "ジョブカンを開く" }]
      }
    );
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
    console.log("check silently");
    jobcan
      .login()
      .then(jobcan.loadJobcanPage)
      .then((data) => {
        updateBadge(data);
        if (calcTotalCount(data) > 0) {
          notify(data);
        }
      })
      .catch(() => {
        showErrorBadge();
      });
  }

  /*
   * 強制的にチェック（通知あり）
   */
  chrome.browserAction.onClicked.addListener((tab) => {
    jobcan
      .login()
      .then(jobcan.loadJobcanPage)
      .then((data) => {
        updateBadge(data);
        notify(data);
      })
      .catch((err) => {
        showErrorBadge();
        notifyError(err.message);
      });
  });

  // 定期的にチェック
  chrome.alarms.onAlarm.addListener((alarm) => {
    checkSilently();
  });
  chrome.alarms.create({ periodInMinutes: 2 });

  // 通知のイベント
  chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
    switch(notificationId) {
      case "jobcanChecker.showStatus":
        chrome.notifications.clear("jobcanChecker.showStatus");
        jobcan.openJobcanPage();
        break;

      case "jobcanChecker.showError":
        chrome.notifications.clear("jobcanChecker.showError");
        switch(buttonIndex) {
          case 0:
            // オプションを開く
            chrome.runtime.openOptionsPage();
            break;
          case 1:
            // ジョブカンを開く
            jobcan.openJobcanPage();
            break;
        }
        break;
    }
  });

  // ジョブカンインスタンス作成
  let jobcan = new Jobcan();

  // ログインしてチェック
  checkSilently();

})(jQuery);
