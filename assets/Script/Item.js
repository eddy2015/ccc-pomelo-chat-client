
cc.Class({
    extends: cc.Component,

    properties: {
        label: {
            default: null,
            type: cc.Label
        },
        itemID: 0
    },
    
    setListView: function(listView) {
        this.listView = listView;
    },

    updateItem: function(tmplId, itemId, userName) {
        this.itemID = itemId;
        this.userName = userName;
        if (userName) {
            this.label.string = userName;
        } else {
            this.label.string = tmplId + ' Item#' + this.itemID;
        }
    },
    
    onClicked: function () {
        cc.log("item onClicked()");
        if (this.userName) {
            this.listView.clickedItem(this.itemID);
        }
    },
});
