
var reg = /^[a-zA-Z0-9_\u4e00-\u9fa5]+$/;
var LOGIN_ERROR = "There is no server to log in, please wait.";
var LENGTH_ERROR = "Name/Channel is too long or too short. 20 character max.";
var NAME_ERROR = "Bad character in Name/Channel. Can only have letters, numbers, Chinese characters, and '_'";
var DUPLICATE_ERROR = "Please change your name to login.";
var MSG_ERROR = "Message is empty!";

var util = {
	urlRE: /https?:\/\/([-\w\.]+)+(:\d+)?(\/([^\s]*(\?\S+)?)?)?/g,
	//  html sanitizer
	toStaticHTML: function(inputHtml) {
		inputHtml = inputHtml.toString();
		return inputHtml.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
	},
	//pads n with zeros on the left,
	//digits is minimum length of output
	//zeroPad(3, 5); returns "005"
	//zeroPad(2, 500); returns "500"
	zeroPad: function(digits, n) {
		n = n.toString();
		while(n.length < digits)
		n = '0' + n;
		return n;
	},
	//it is almost 8 o'clock PM here
	//timeString(new Date); returns "19:49"
	timeString: function(date) {
		var minutes = date.getMinutes().toString();
		var hours = date.getHours().toString();
		return this.zeroPad(2, hours) + ":" + this.zeroPad(2, minutes);
	},

	//does the argument only contain whitespace?
	isBlank: function(text) {
		var blank = /^\s*$/;
		return(text.match(blank) !== null);
	}
};

var ListView = require("ListView");

cc.Class({
    extends: cc.Component,

    properties: {
        loginNode: cc.Node,
        roomNode: cc.Node,
        
        ipEB: cc.EditBox,
        portEB: cc.EditBox,
        userNameEB: cc.EditBox,
        roomIdEB: cc.EditBox,
        
        userLabel: cc.Label,
        channelLabel: cc.Label,
        msgScrollView: cc.ScrollView,
        msgLabel: cc.Label,
        msgEditBox: cc.EditBox,
        
        userListView: {
            default: null,
            type: ListView,
        },
        targetLabel: cc.Label,
        
        errorLabel: cc.Label,
    },

    // use this for initialization
    onLoad: function () {
        var that = this;
        
        //wait message from the server.
    	pomelo.on('onChat', function(data) {
    		that.addMessage(data.from, data.target, data.msg);

    	});
    
    	//update user list
    	pomelo.on('onAdd', function(data) {
    		var user = data.user;
    		that.tip('online', user);
    		that.addUser(user);
    	});
    
    	//update user list
    	pomelo.on('onLeave', function(data) {
    		var user = data.user;
    		that.tip('offline', user);
    		that.removeUser(user);
    	});
    
    
    	//handle disconect message, occours when the client is disconnect with servers
    	pomelo.on('disconnect', function(reason) {
    	    cc.log("pomelo.on() disconnect: ", reason);
    		that.showLogin();
    	});
    	
    	pomelo.on('io-error', function(data) {
    	    cc.log("pomelo.on() io-error: ", data);
            that.showError("连接失败，请检查服务器是否已经启动成功！");
    	});

        this.serverIp = "127.0.0.1";
        this.serverPort = "3014",
        this.userName = "";
        this.channelName = "";
        
        this.ipEB.string = this.serverIp;
        this.portEB.string = this.serverPort;
        
        this.users = null;
        
        this.showLogin();
        // scrollView在onLoad中执行scrollToBottom()方法，
        // 并不会完全滚动到底部，延时一点执行即可。
        // this.scrollDown();
        this.scheduleOnce(this.scrollDown, 0);

        // test
        var obj = {code: 400, msg: "reutrn error"};
        cc.error(obj);
    },

    // called every frame
    update: function (dt) {

    },
    
    //always view the most recent message when it is added
    scrollDown: function() {
        cc.log("scrollDown()");
        var content = this.msgScrollView.content;
        cc.log("content height: " + content.height);
        cc.log("content x: " + content.x + ", y: " + content.y);
        
        // 当scrollView中的content高度太小时，
        // 执行scrollToBottom()会引起content坐标有误造成无法看到content，
        // 估计是ccc 1.1版本的bug
        if (content.height <= this.msgScrollView.node.height) {
            cc.log("scrollDown() return false");
            return;
        }
        
        // this.msgScrollView.scrollTo(cc.p(0, 0), 0.1);
    	this.msgScrollView.scrollToBottom();
        // this.msgScrollView.scrollToPercentVertical(0);
    },
    
    // add message on board
    addMessage: function(from, target, text, time) {
        cc.log("addMessage()");
        // var content = this.msgScrollView.content;
        // cc.log("content height: " + content.height);
        
    	var name = (target == '*' ? 'all' : target);
    	if(text === null) return;
    	if(time == null) {
    		// if the time is null or undefined, use the current time.
    		time = new Date();
    	} else if((time instanceof Date) === false) {
    		// if it's a timestamp, interpret it
    		time = new Date(time);
    	}
    	//every message you see is actually a table with 3 cols:
    	//  the time,
    	//  the person who caused the event,
    	//  and the content
    	text = util.toStaticHTML(text);
        	
        var curMsg = "";
        if (from == "") {
            curMsg = util.timeString(time) + " tip: " + text;
        } else {
        	curMsg = util.timeString(time) + " " + util.toStaticHTML(from) 
        	    + ' says to ' + name + ': ' + text + "\n";
        }
        
        this.msgLabel.string = this.msgLabel.string + curMsg;
        // cc.log("after add msg content height: " + content.height);
        
    	this.scrollDown();
    },
    
    // show login panel
    showLogin: function() {
        cc.log("showLogin()");
        
    	this.loginNode.active = true;
        this.roomNode.active = false;
        
        // this.userName = "";
        // this.channelName = "";
        // this.userNameEB.string = "";
        // this.roomIdEB.string = "";
        // this.users = null;
        
        // clear msg
        this.msgLabel.string = "";
        this.scrollDown();
        this.targetLabel.string = "all";
    },

    // show chat panel
    showChat: function() {
    	this.loginNode.active = false;
        this.roomNode.active = true;
        this.userListView.setChat(this);
        this.userListView.hide();
        
    	this.scrollDown();
    },
    
    login: function() {
        cc.log("login()");
        var that = this;
        
        this.serverIp  = this.ipEB.string;
        this.serverPort = this.portEB.string;
        var username = that.userNameEB.string;
        var rid = that.roomIdEB.string;
        
        if(username.length > 20 || username.length == 0 || rid.length > 20 || rid.length == 0) {
			that.showError(LENGTH_ERROR);
			return false;
		}

		if(!reg.test(username) || !reg.test(rid)) {
			that.showError(NAME_ERROR);
			return false;
		}
        
        cc.log("login() user name: " + username);
        cc.log("login() channel name: " + rid);
        
        //query entry of connection
        that.queryEntry(username, function(host, port) {
        	pomelo.init({
        		host: host,
        		port: port,
        		log: true
        	}, function() {
        		var route = "connector.entryHandler.enter";
        		pomelo.request(route, {
        			username: username,
        			rid: rid
        		}, function(data) {
        		    cc.log("pomelo.request return data: ", data);
        			if(data.error) {
        				that.showError(DUPLICATE_ERROR);
        				return;
        			}
        			
                    that.userName = username;
                    that.channelName = rid;
                    
                    that.userLabel.string = username;
                    that.channelLabel.string = rid;
                    that.showChat();
                    that.initUserList(data);
        		});
        	});
        });
    },

    // query connector
    queryEntry: function(uid, callback) {
        var that = this;
        
    	var route = 'gate.gateHandler.queryEntry';
    	pomelo.init({
    		host: that.serverIp,
    		port: that.serverPort,
    		log: true
    	}, function() {
    		pomelo.request(route, {
    			uid: uid
    		}, function(data) {
    		    cc.log("pomelo.request return data: ", data);
    		    
    			pomelo.disconnect();
    			if(data.code === 500) {
    				that.showError(LOGIN_ERROR);
    				return;
    			}
    			// 返回的data.host为"127.0.0.1"，
    // 			测试时需要改成本机ip否则Android手机连接不上
    // 			callback(data.host, data.port);
                callback(that.serverIp, data.port);
    		});
    	});
    },
    
    // show error
    showError: function(content) {
        cc.log("error: " + content);
        
        this.errorLabel.string = content;
        
        this.unschedule(this.clearErrorMsg);
        this.scheduleOnce(this.clearErrorMsg, 3);
    },
    
    clearErrorMsg: function() {
        this.errorLabel.string = "";
    },
    
    // show tip
    tip: function(type, name) {
    	var tip, title;
    	switch(type){
    		case 'online':
    			tip = name + ' is online now.';
    			title = 'Online Notify';
    			break;
    		case 'offline':
    			tip = name + ' is offline now.';
    			title = 'Offline Notify';
    			break;
    		case 'message':
    			tip = name + ' is saying now.'
    			title = 'Message Notify';
    			break;
    	}
    
        this.addMessage("", "", title + " " + tip);
    },
   
    // init user list
    initUserList: function(data) {
        cc.log("initUserList()");
        
    	this.users = data.users;
    	// 添加一个"all"元素到数组第一个位置，表示发送给在线所有用户
    	this.users.splice(0, 0, "all");
    	for(var i = 0; i < this.users.length; i++) {
            cc.log("users " + i + ": " + this.users[i]);
    	}
    },

    // add user in user list
    addUser: function(user) {
        cc.log("addUser() user: " + user);
        
        this.users[this.users.length] = user;
        
        this.userListView.setUsers(this.users);
    },

    // remove user from user list
    removeUser: function(user) {
        cc.log("removeUser() user: " + user);
        
        var index = -1;
        for (var i = 0; i < this.users.length; i++) {
            if (this.users[i] == user) {
                index = i;
                break;
            }
        }
        if (index != -1) {
            this.users.splice(index, 1);
        }
        
        this.userListView.setUsers(this.users);
        
        // 如果移除的用户是当前信息接收用户，重置为all
        var target = this.targetLabel.string;
        if (target == user) {
            this.targetLabel.string = "all";
        }
    },
    
    showUserList: function() {
        cc.log("showUserList()");
        this.userListView.setUsers(this.users);
        this.userListView.show();
    },
    
    chooseUser: function(index) {
        cc.log("chooseUser() index: " + index);
        
        this.targetLabel.string = this.users[index];
        this.userListView.hide();
    },
    
    sendMsg: function() {
        cc.log("sendMsg()");
        var that = this;
        
        var msg = that.msgEditBox.string.replace("\n", "");
        if (msg.length == 0) {
            that.showError(MSG_ERROR);
            return;
        }
        
        // that.addMessage("userName", "target", msg);// test
        
        var route = "chat.chatHandler.send";
		var target = this.targetLabel.string;
		if (target == "all") {
		    target = "*";// 服务端定义"*" 表示发送消息给所有在线用户
		}

        var rid = that.channelName;
        var username = that.userName;
		if(!util.isBlank(msg)) {
			pomelo.request(route, {
				rid: rid,
				content: msg,
				from: username,
				target: target
			}, function(data) {
			    // 当发送消息成功后，在服务端不会推送该消息到该用户的情况，
			    // 客服端主动添加该消息到聊天窗口
				if(target != '*' && target != username) {
					that.addMessage(username, target, msg);
				}
			});
		}
    },
    
    logout: function () {
       cc.log("logout()");
       
       // 断开连接，会触发pomelo.on('disconnect', function(reason)
       pomelo.disconnect();
    },
});
