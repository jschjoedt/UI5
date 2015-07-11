sap.ui.core.mvc.Controller.extend("FEHMonitor.view.Detail", {

	onInit: function() {
		this.oInitialLoadFinishedDeferred = jQuery.Deferred();

		if (sap.ui.Device.system.phone) {
			//Do not wait for the master when in mobile phone resolution
			this.oInitialLoadFinishedDeferred.resolve();
		} else {
			this.getView().setBusy(true);
			var oEventBus = this.getEventBus();
			oEventBus.subscribe("Component", "MetadataFailed", this.onMetadataFailed, this);
			oEventBus.subscribe("Master", "InitialLoadFinished", this.onMasterLoaded, this);
		}

		this.getRouter().attachRouteMatched(this.onRouteMatched, this);
	},

	onRetry: function() {
		this.onExecute(2);
	},

	onConfirm: function() {
		this.onExecute(3);
	},

	onFail: function() {
		this.onExecute(4);
	},

	onExecute: function(method) {
		console.log(method);
		var orderId = this.getView().byId("textOrderId").getProperty("text");

		console.log(orderId);

		// set data model
		var serviceUrl = "/sap/opu/odata/sap/Z_FEH_MONITOR_SRV/";
		var jsonURL = serviceUrl + "executeMethod?method='" + method + "'&orderId='" + orderId + "'&$format=json";

		var oModel = new sap.ui.model.json.JSONModel();

		oModel.attachRequestSent(function() {
			console.log("Start");
		});
		oModel.attachRequestCompleted(function() {

			jQuery.sap.require('sap.m.MessageToast');
			sap.m.MessageToast.show(oModel.getProperty("/d/message"));
			console.log(oModel.getProperty("/d/message"));

			//var masterController = sap.ui.controller("FEHMonitor.view.Master");
			//masterController.refreshModel();
			console.log("Completed");
		});
		oModel.attachRequestFailed(function() {
			console.log("Fault!");
		});

		oModel.loadData(jsonURL);

	},

	handleIconTabBarSelect: function(oEvent) {

		var key = oEvent.getParameter("selectedKey");
		var list = this.getView().byId("ListErrorHistory");

		//var listItemCount = list.getBinding("items").getLength();

		if (key === "__xmlview2--iconTabFilterErrorHistory") {
			console.log("ErrorHistory");
			// Get payload using OrderID.
			var orderId = this.getView().byId("textOrderId").getProperty("text");
			console.log(orderId);
			// set data model
			var serviceUrl = "/sap/opu/odata/sap/Z_FEH_MONITOR_SRV/";
			var jsonURL = serviceUrl + "getErrorHistory?orderId='" + orderId + "'&$format=json";

			var oModel = new sap.ui.model.json.JSONModel();

			oModel.attachRequestSent(function() {
				console.log("Start");
			});
			oModel.attachRequestCompleted(function() {

				console.log("Completed");
				list.setModel(oModel);

			});
			oModel.attachRequestFailed(function() {
				console.log("Fault!");
			});

			oModel.loadData(jsonURL);
		} else if (key === "__xmlview2--iconTabFilterPayload") {

			var textArea = this.getView().byId("TextAreaPayload");

			if (textArea.getValue() == "") {
				console.log("Payload");
				// Get payload using OrderID.
				var orderId = this.getView().byId("textOrderId").getProperty("text");

				console.log(orderId);

				// set data model
				var serviceUrl = "/sap/opu/odata/sap/Z_FEH_MONITOR_SRV/";
				var jsonURL = serviceUrl + "getPayload?orderId='" + orderId + "'&$format=json";

				var oModel = new sap.ui.model.json.JSONModel();

				oModel.attachRequestSent(function() {
					console.log("Start");
				});
				oModel.attachRequestCompleted(function() {

					console.log("Completed");
					textArea.setValue(oModel.getProperty("/d/message"));

				});
				oModel.attachRequestFailed(function() {
					console.log("Fault!");
				});

				oModel.loadData(jsonURL);

			}

		} else if (key === "__xmlview2--iconTabFilterDetails") {
			console.log("OrderDetails");
		}

	},

	onMasterLoaded: function(sChannel, sEvent) {
		this.getView().setBusy(false);
		this.oInitialLoadFinishedDeferred.resolve();
	},

	onMetadataFailed: function() {
		this.getView().setBusy(false);
		this.oInitialLoadFinishedDeferred.resolve();
		this.showEmptyView();
	},

	onRouteMatched: function(oEvent) {
		var oParameters = oEvent.getParameters();

		jQuery.when(this.oInitialLoadFinishedDeferred).then(jQuery.proxy(function() {
			var oView = this.getView();

			// When navigating in the Detail page, update the binding context
			if (oParameters.name !== "detail") {
				return;
			}

			var sEntityPath = "/" + oParameters.arguments.entity;
			this.bindView(sEntityPath);

			var oIconTabBar = oView.byId("idIconTabBar");
			oIconTabBar.getItems().forEach(function(oItem) {
				if (oItem.getKey() !== "selfInfo") {
					oItem.bindElement(oItem.getKey());
				}
			});

			// Specify the tab being focused
			var sTabKey = oParameters.arguments.tab;
			this.getEventBus().publish("Detail", "TabChanged", {
				sTabKey: sTabKey
			});

			if (oIconTabBar.getSelectedKey() !== sTabKey) {
				oIconTabBar.setSelectedKey(sTabKey);
			}
		}, this));

	},

	bindView: function(sEntityPath) {
		var oView = this.getView();
		oView.bindElement(sEntityPath);

		//Check if the data is already on the client
		if (!oView.getModel().getData(sEntityPath)) {

			// Check that the entity specified was found.
			oView.getElementBinding().attachEventOnce("dataReceived", jQuery.proxy(function() {
				var oData = oView.getModel().getData(sEntityPath);
				if (!oData) {
					this.showEmptyView();
					this.fireDetailNotFound();
				} else {
					this.fireDetailChanged(sEntityPath);
				}
			}, this));

		} else {
			this.fireDetailChanged(sEntityPath);
		}

	},

	showEmptyView: function() {
		this.getRouter().myNavToWithoutHash({
			currentView: this.getView(),
			targetViewName: "FEHMonitor.view.NotFound",
			targetViewType: "XML"
		});
	},

	fireDetailChanged: function(sEntityPath) {
		this.getEventBus().publish("Detail", "Changed", {
			sEntityPath: sEntityPath
		});

		// Clear ErrorHistory and Payload data when selection changes.
		this.getView().byId("TextAreaPayload").setValue("");
		this.getView().byId("ListErrorHistory").destroyItems();

		// Set details tab as default.
		var currentKey = this.getView().byId("idIconTabBar").setSelectedKey("__xmlview2--iconTabFilterDetails");

	},

	fireDetailNotFound: function() {
		this.getEventBus().publish("Detail", "NotFound");
	},

	onNavBack: function() {
		// This is only relevant when running on phone devices
		this.getRouter().myNavBack("main");
	},

	onDetailSelect: function(oEvent) {
		sap.ui.core.UIComponent.getRouterFor(this).navTo("detail", {
			entity: oEvent.getSource().getBindingContext().getPath().slice(1),
			tab: oEvent.getParameter("selectedKey")
		}, true);

	},

	openActionSheet: function() {

		if (!this._oActionSheet) {
			this._oActionSheet = new sap.m.ActionSheet({
				buttons: new sap.ushell.ui.footerbar.AddBookmarkButton()
			});
			this._oActionSheet.setShowCancelButton(true);
			this._oActionSheet.setPlacement(sap.m.PlacementType.Top);
		}

		this._oActionSheet.openBy(this.getView().byId("actionButton"));
	},

	getEventBus: function() {
		return sap.ui.getCore().getEventBus();
	},

	getRouter: function() {
		return sap.ui.core.UIComponent.getRouterFor(this);
	},

	onExit: function(oEvent) {
		var oEventBus = this.getEventBus();
		oEventBus.unsubscribe("Master", "InitialLoadFinished", this.onMasterLoaded, this);
		oEventBus.unsubscribe("Component", "MetadataFailed", this.onMetadataFailed, this);
		if (this._oActionSheet) {
			this._oActionSheet.destroy();
			this._oActionSheet = null;
		}
	}
});