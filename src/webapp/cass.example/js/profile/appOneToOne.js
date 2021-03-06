/*
 Copyright 2015-2016 Eduworks Corporation and other contributing parties.

 Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
*/

$("#oneToOne").on("click", ".contact", null, function (e) {
    oneToOneSearch();
}, error);

$("#oneToOne").on("click", ".cass-framework", null, function (e) {
    oneToOneSearch();
}, error);

$("#oneToOne").on("click", ".cass-competency", null, function (e) {
    oneToOneSearch();
}, error);

$("#oneToOne").on("click", ".assertionActionDelete", null, function (e) {
    if (confirm("This will delete the selected assertion. Continue?") == true)
        EcRepository.get($(this).parents("#oneToOneAssertion").attr("url"), function (assertion) {
            EcRepository._delete(assertion, function (success) {
                oneToOneSearch();
            }, error);
        });
}, error);

$("#oneToOne,#oneToMany").on("click", ".assertionEvidence", null, function (e) {
    $("#evidenceViewerList").html($(this).parents("#oneToOneAssertion").find(".assertionEvidenceStore").html());
    $('#evidenceViewer').foundation('open');
}, error);

function oneToOneBaseSearchString() {

    var contactPk = $("#contactSelector").find(".contact[aria-selected='true'] > #identity").attr("title");
    if (contactPk == null && identity != null)
        contactPk = identity.ppk.toPk().toPem();

    var searchString = "(@type:\"" + EcAssertion.myType + "\")";
    if (contactPk != null) {
        searchString += " AND (\\*@reader:\"" +
            contactPk.trim().replace(/\r?\n/g, "") +
            "\" OR \\*@owner:\"" +
            contactPk.trim().replace(/\r?\n/g, "") +
            "\")";
        var selectedContact = EcIdentityManager.getContact(EcPk.fromPem(contactPk));
        if (selectedContact != null)
            $("#selectedContact").text(selectedContact.displayName);
        var selectedIdentity = EcIdentityManager.getIdentity(EcPk.fromPem(contactPk));
        if (selectedIdentity != null)
            $("#selectedContact").text(selectedIdentity.displayName);
    } else {
        $("#selectedContact").text("Public Information")
    }
    return searchString;
}

var noAssertionHtml = "No assertions found matching this criteria.<br><br>In order to see information here, you may: <ul><li>Use a CASS enabled learning resource that reports competence data.</li><li>Connect with other individuals by inviting them to use CASS and making assertions about each other.</li></ul>";

function oneToOneSearch() {
    if ($("#oneToOne").html() == "") return;
    var competencyId = $("#frameworks").find(".cass-competency.is-active").attr("url");

    var searchString = oneToOneBaseSearchString();

    if (competencyId != null) {
        searchString += " AND (competency:\"" + competencyId + "\")";
    } else {
        var frameworkId = $("#frameworks").find(".is-active").attr("url");
        if (frameworkId != null) {
            EcRepository.get(frameworkId, function (framework) {
                var searchString = oneToOneBaseSearchString();

                if (framework != null) {
                    searchString += " AND (";
                    for (var i = 0; i < framework.competency.length; i++) {
                        if (i != 0)
                            searchString += " OR ";
                        searchString += "(competency:\"" + framework.competency[i] + "\")";
                    }
                    searchString += ")";
                }

                repo.search(searchString, null,
                    function (assertions) {
                        $("#oneToOneAssertions").text("");
                        if (identity == null)
                            $("#oneToOneAssertions").text("You must log in to view assertions.");
                        else {
                            if (assertions == null || assertions.length == 0)
                                $("#oneToOneAssertions").html(noAssertionHtml);
                            else
                                for (var i = 0; i < assertions.length; i++) {
                                    displayAssertionSearchItem($("#oneToOneAssertions"), assertions[i]);
                                }
                        }
                    }, error
                );
            }, error);
            return;
        }
    }

    repo.search(searchString, null,
        function (assertions) {
            $("#oneToOneAssertions").text("");
            if (identity == null)
                $("#oneToOneAssertions").text("You must log in to view assertions.");
            else {
                if (assertions == null || assertions.length == 0)
                    $("#oneToOneAssertions").html(noAssertionHtml);
                else
                    for (var i = 0; i < assertions.length; i++) {
                        displayAssertionSearchItem($("#oneToOneAssertions"), assertions[i]);
                    }
            }
        }, error
    );
}

var cassAssertionTemplate = $("#oneToOneAssertion").outerHTML();
$("#oneToOneAssertion").remove();

function displayAssertionSearchItem(where, assertion) {
    EcRepository.get(assertion.shortId(), function (assertion) {
        var a = new EcAssertion();
        a.copyFrom(assertion);
        where.append(cassAssertionTemplate);

        var ui = where.children().last();
        ui.hide();

        ui.attr("url", assertion.shortId());

        if (a.competency != null)
            (function (ui, a) {
                EcRepository.get(a.competency, function (competency) {
                    ui.find(".assertionCompetency").attr("url", competency.shortId()).text(competency.name);
                }, error);
            })(ui, a);

        if (a.level != null && a.level.startsWith("http")) {
            (function (ui, a) {
                EcRepository.get(a.level, function (level) {
                    ui.find(".assertionLevel").text(level.name);
                }, error);
            })(ui, a);
        } else
            ui.find(".assertionOptionLevel").hide();

        if (a.getEvidenceCount() == 0)
            if (a.agent == null)
                ui.find(".assertionEvidence").text("<Restricted> evidence");
            else
                ui.find(".assertionEvidence").text("No evidence");
        else if (a.getEvidenceCount() == 1)
            ui.find(".assertionEvidence").css("text-decoration", "underline").text(a.getEvidenceCount() + " piece of evidence");
        else
            ui.find(".assertionEvidence").css("text-decoration", "underline").text(a.getEvidenceCount() + " pieces of evidence");

        ui.find(".assertionConfidence").text(Math.round(a.confidence * 100) + "% confidence");

        timeout(function () {
            var agent = a.getAgent();
            if (agent != null)
                if (EcIdentityManager.getPpk(agent) != null) {
                    ui.find(".assertionAgent").text("You").attr("title", agent.toPem());
                    ui.find(".assertionActionDelete").show();
                } else
                    ui.find(".assertionAgent").text(a.getAgentName()).attr("title", agent.toPem());
        });
        timeout(function () {
            var subject = a.getSubject();
            if (subject != null)
                if (EcIdentityManager.getPpk(subject) != null) {
                    ui.find(".assertionSubject").text("You").attr("title", subject.toPem());
                } else
                    ui.find(".assertionSubject").text(a.getSubjectName()).attr("title", subject.toPem());

        });
        timeout(function () {
            var assertionDate = a.getAssertionDate();
            if (assertionDate != null) ui.find(".assertionTimestamp").attr("title", moment(assertionDate).format('MMMM Do YYYY, h:mm:ss a')).attr("time", assertionDate).text(moment(assertionDate).fromNow().charAt(0).toUpperCase() + moment(assertionDate).fromNow().slice(1));
            var expirationDate = a.getExpirationDate();
            try {
                var now = moment().valueOf();
                var spn = expirationDate - assertionDate;
                var elp = now - assertionDate;
                var opc = 1.0 - (elp / spn);
                if (elp == now) {
                    ui.css("color", "gray");
                    ui.find(".assertionExpirationProgress").text("will expire <Restricted>");
                } else if (opc < 0) {
                    ui.css("color", "gray");
                    ui.find(".assertionExpirationProgress").text("is Expired");
                } else if (opc > 1) {
                    ui.css("color", "gray");
                    ui.find(".assertionExpirationProgress").text("is Not yet issued");
                } else {
                    ui.find(".assertionExpirationProgress").text("will expire " + moment(expirationDate).fromNow()).attr("title", moment(expirationDate).format('MMMM Do YYYY, h:mm:ss a')).attr("time", expirationDate);
                }
            } catch (e) {
                ui.css("opacity", a.confidence);
            }
        });
        if (a.getEvidenceCount() == 0)
            if (a.agent == null)
                ui.find(".assertionEvidenceStore").text("You do not have permission to view this evidence.");
            else
                ui.find(".assertionEvidenceStore").html("No evidence.");
        else
            for (var i = 0; i < a.getEvidenceCount(); i++) {
                (function (ui, i, a) {
                    timeout(function () {
                        ui.find(".assertionEvidenceStore").append("<li class='assertionEvidence' style='list-style: none;'/>");
                        var evidenceEntry = ui.find(".assertionEvidenceStore").children().last();
                        var evidence = a.getEvidence(i);
                        if (evidence.startsWith("http")) {
                            evidenceEntry.append("<a/>");
                            evidenceEntry.children().last().attr("href", evidence).text(evidence);
                        } else {
                            evidenceEntry.append(evidence);
                        }
                    });
                })(ui, i, a);
            }
        timeout(function () {
            var parent = ui.parent()
            var uiChildren = parent.children('li');

            uiChildren.sort(function (a, b) {
                var an = parseInt($(a).find(".assertionTimestamp").attr("time"));
                var bn = parseInt($(b).find(".assertionTimestamp").attr("time"));

                if (an > bn) {
                    return -1;
                }
                if (an < bn) {
                    return 1;
                }
                return 0;
            });

            uiChildren.detach().appendTo(parent);
            ui.slideDown(1000);
        });


    }, error);
}

function slideInContacts()
{
    $("#contactSelectorPlaceholder").toggle();
    $("#contactSelector").slideToggle();
}
function slideInFrameworks()
{
    $("#oneToOneFrameworkPlaceholder").toggle();
    $("#oneToOneFramework").slideToggle();
}