/*--------------------------------------------------------------------------+
 This file is part of ARSnova.
 app/home/homePanel.js
 - Beschreibung: Startseite für User in der Rolle "Zuhörer/in".
 - Version:      1.0, 01/05/12
 - Autor(en):    Christian Thomas Weber <christian.t.weber@gmail.com>
 +---------------------------------------------------------------------------+
 This program is free software; you can redistribute it and/or
 modify it under the terms of the GNU General Public License
 as published by the Free Software Foundation; either version 2
 of the License, or any later version.
 +---------------------------------------------------------------------------+
 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.
 You should have received a copy of the GNU General Public License
 along with this program; if not, write to the Free Software
 Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 +--------------------------------------------------------------------------*/
Ext.define('ARSnova.view.home.HomePanel', {
	extend: 'Ext.Container',
	
	config: {
		fullscreen: true,
		scrollable: {
			direction: 'vertical',
			directionLock: true
		}
	},
	
	inClassRendered	: false,
	userInClass		: null,
	speakerInClass	: null,
	outOfClass		: null,
	
	/* toolbar items */
	toolbar				: null,
	logoutButton		: null,
	sessionLogoutButton	: null,
	
	initialize: function() {
		this.callParent(arguments);
		
		this.logoutButton = Ext.create('Ext.Button', {
			text	: Messages.LOGOUT,
			ui		: 'back',
			handler	: function() {
				ARSnova.app.getController('Auth').logout();
			}
		});
		
		this.toolbar = Ext.create('Ext.Toolbar', {
			title: 'Session',
			docked: 'top',
			ui: 'light',
			items: [
		        this.logoutButton
			]
		});
		
		this.outOfClass = Ext.create('Ext.form.FormPanel', {
			title: 'Out of class',
			cls  : 'standardForm',
			scrollable: null,
				
			items: [{
				xtype		: 'button',
				ui			: 'normal',
				text		: 'Sessions',
				cls			: 'forwardListButton',
				controller	: 'user',
				action		: 'index',
				handler		: this.buttonClicked
			}]
		});
		
		this.sessionLoginForm = Ext.create('Ext.Panel', {
			layout : {
				type : 'vbox',
				pack : 'center',
				align: 'center'
			},
			
			items: [{
					xtype	: 'panel',
					cls		: null,
					html	: "<div class='arsnova-logo'></div>",
					style	: { marginTop: '35px', marginBottom: '30px' }
				}, {
					submitOnAction: false,
					xtype: 'formpanel',
					scrollable: null,
					width: '310px',
					margin: '0 auto',
					
					items: [{
							xtype : 'fieldset',
							cls: 'bottomMargin',
							
							items: [{
								xtype		: 'textfield',
								component: {
									xtype: 'input',
									cls: 'joinSessionInput',
									type: 'tel',
									maxLength: 16,
								},
								name		: 'keyword',
								placeHolder	: Messages.SESSIONID_PLACEHOLDER,
								listeners: {
									scope: this,
									action: this.onSubmit
								}
							}]
						}, {
							xtype	: 'button',
							height	: '45px',
							margin	: '-10px 10px 0',
							ui		: 'confirm',
							text	: Messages.GO,
							handler	: this.onSubmit,
							scope	: this
						}]
			}]
		});
		
		this.lastVisitedSessionsFieldset = Ext.create('Ext.form.FieldSet', {
			cls: 'standardFieldset',
			title: Messages.MY_SESSIONS
		});
		
		this.lastVisitedSessionsForm = Ext.create('Ext.form.FormPanel', {
			scrollable: null,
			cls: 'standardForm',
			items: [this.lastVisitedSessionsFieldset]
		});
		
		this.add([
		    this.toolbar,
            this.sessionLoginForm,
            this.lastVisitedSessionsForm
        ]);
		
		this.on('painted', function(){
			this.loadVisitedSessions();
			ARSnova.app.hideLoadMask();
		});
	},
	
	checkLogin: function(){
		if (ARSnova.app.loginMode == ARSnova.app.LOGIN_THM) {
			this.logoutButton.addCls('thm');
		}
	},
	
	buttonClicked: function(button) {
		ARSnova.app.getController(button.controller)[button.action]();
	},
	
	onSubmit: function() {
		ARSnova.app.showLoadMask(Messages.LOGIN_LOAD_MASK);
		
		//delete the textfield-focus, to hide the numeric keypad on phones
		this.down('textfield').blur();
		
		ARSnova.app.getController('Sessions').login({
			keyword	  : this.down('textfield').getValue().replace(/ /g, ""),
			destroy   : false,
			panel	  : this
		});
	},
	
	loadVisitedSessions: function() {
		if(ARSnova.app.userRole == ARSnova.app.USER_ROLE_SPEAKER) return;
		
		ARSnova.app.showLoadMask(Messages.LOAD_MASK_SEARCH);

		ARSnova.app.restProxy.getMyVisitedSessions({
			success: function(sessions) {
				var panel = ARSnova.app.mainTabPanel.tabPanel.homeTabPanel.homePanel;
				var caption = Ext.create('ARSnova.view.Caption');

				var badgePromises = [];

				if (sessions && sessions.length !== 0) {
					panel.lastVisitedSessionsFieldset.removeAll();
					panel.lastVisitedSessionsForm.show();

					for ( var i = 0; i < sessions.length; i++) {
						var session = sessions[i];
						var course = " defaultsession";

						if (session.courseId && session.courseId.length > 0) {
							course = " coursesession";
						}
						
						// Minimum width of 481px equals at least landscape view
						var displaytext = window.innerWidth > 481 ? session.name : session.shortName; 
						var sessionButton = Ext.create('ARSnova.view.MultiBadgeButton', {
							xtype		: 'button',
							ui			: 'normal',
							text		: displaytext,
							cls			: 'forwardListButton' + course,
							controller	: 'sessions',
							action		: 'showDetails',
							badgeCls	: 'badgeicon',
							sessionObj	: session,
							handler		: function(options){
								ARSnova.app.showLoadMask("Login...");
								ARSnova.app.getController('Sessions').login({
									keyword		: options.config.sessionObj.keyword
								});
							}
						});
						panel.lastVisitedSessionsFieldset.add(sessionButton);
						badgePromises.push(panel.updateBadge(session.keyword, sessionButton));
						
						if (!session.active) {
							panel.down('button[text=' + displaytext + ']').addCls("isInactive");
						}
					}
					RSVP.all(badgePromises).then(Ext.bind(caption.explainBadges, caption));
					caption.explainStatus(sessions);
					panel.lastVisitedSessionsFieldset.add(caption);
				} else {
					panel.lastVisitedSessionsForm.hide();
				}
			},
			unauthenticated: function() {
				ARSnova.app.getController('Auth').login({
					mode: ARSnova.app.loginMode
				});
			},
			failure: function(){
				console.log('server-side error loggedIn.save');
				ARSnova.app.mainTabPanel.tabPanel.homeTabPanel.homePanel.lastVisitedSessionsForm.hide();
			}
		}, (window.innerWidth > 481 ? 'name' : 'shortname'));
	},
	
	updateBadge: function(sessionKeyword, button) {
		var promise = new RSVP.Promise();
		ARSnova.app.questionModel.getUnansweredSkillQuestions(sessionKeyword, {
			success: function(newQuestions) {
				button.setBadge([{ badgeText: newQuestions.length }]);
				promise.resolve(newQuestions.length);
			},
			failure: function(response) {
				console.log('error');
				promise.reject();
			}
		});
		return promise;
	}
});