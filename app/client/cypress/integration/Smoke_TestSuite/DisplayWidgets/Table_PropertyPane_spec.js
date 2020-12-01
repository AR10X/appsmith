const widgetsPage = require("../../../locators/Widgets.json");
const commonlocators = require("../../../locators/commonlocators.json");
const publish = require("../../../locators/publishWidgetspage.json");
const dsl = require("../../../fixtures/tableNewDsl.json");
const pages = require("../../../locators/Pages.json");
const testdata = require("../../../fixtures/testdata.json");

describe("Table Widget property pane feature validation", function() {
  before(() => {
    cy.addDsl(dsl);
  });

  it("Check collapse section feature in property pane", function() {
    cy.openPropertyPane("tablewidget");
    //check open and collapse
    cy.get(commonlocators.collapsesection)
      .first()
      .should("be.visible")
      .click();
    cy.tableDataHide("tabledata");
  });

  it("Check open section and column data in property pane", function() {
    cy.get(commonlocators.collapsesection)
      .first()
      .should("be.visible")
      .click();
    cy.tableColumnDataValidation("id");
    cy.tableColumnDataValidation("email");
    cy.tableColumnDataValidation("userName");
    cy.tableColumnDataValidation("productName");
    cy.tableColumnDataValidation("orderAmount");
    cy.tableColumnPopertyUpdate("id", "TestUpdated");
    cy.addColumn("CustomColumn");
    cy.tableColumnDataValidation("DERIVED1"); //To be updated later
    cy.hideColumn("email");
    cy.hideColumn("userName");
    cy.hideColumn("productName");
    cy.hideColumn("orderAmount");
    cy.get(".draggable-header:contains('CustomColumn')").should("be.visible");
  });

  it("Update table json data and check the column names updated", function() {
    cy.widgetText("Table1", widgetsPage.tableWidget, commonlocators.tableInner);
    cy.testJsontext("tabledata", JSON.stringify(this.data.TableInput));
    cy.wait("@updateLayout");
    cy.tableColumnDataValidation("id");
    cy.tableColumnDataValidation("email");
    cy.tableColumnDataValidation("userName");
    cy.tableColumnDataValidation("productName");
    cy.tableColumnDataValidation("orderAmount");
    cy.tableColumnDataValidation("DERIVED1"); //To be updated later
    cy.get(widgetsPage.tableCol)
      .contains("TestUpdated")
      .should("not.be.visible");
  });

  it("Edit column name and validate test for computed value based on column type selected", function() {
    cy.editColumn("id");
    cy.editColName("updatedId");
    cy.readTabledataPublish("1", "1").then(tabData => {
      const tabValue = tabData;
      expect(tabData).to.not.equal("2736212");
      cy.updateComputedValue(testdata.currentRowEmail);
      cy.readTabledataPublish("1", "0").then(tabData => {
        expect(tabData).to.be.equal(tabValue);
        cy.log("computed value of plain text " + tabData);
      });
    });

    cy.changeColumnType("Number");
    cy.readTabledataPublish("1", "5").then(tabData => {
      const tabValue = tabData;
      expect(tabData).to.not.equal("lindsay.ferguson@reqres.in");
      cy.updateComputedValue(testdata.currentRowOrderAmt);
      cy.readTabledataPublish("1", "0").then(tabData => {
        expect(tabData).to.be.equal(tabValue);
        cy.log("computed value of number is " + tabData);
      });
    });

    cy.changeColumnType("Date");
    cy.updateComputedValue(testdata.momentDate);
    cy.readTabledataPublish("1", "0").then(tabData => {
      expect(tabData).to.not.equal("9.99");
      cy.log("computed value of Date is " + tabData);
    });

    cy.changeColumnType("Time");
    cy.updateComputedValue(testdata.momentDate);
    cy.readTabledataPublish("1", "0").then(tabData => {
      expect(tabData).to.not.equal("2736212");
      cy.log("computed value of time is " + tabData);
    });
  });

  it("Test to validate text allignment", function() {
    cy.get(widgetsPage.centerAlign)
      .first()
      .click({ force: true });
    cy.readTabledataValidateCSS("1", "0", "justify-content", "center");
    cy.get(widgetsPage.rightAlign)
      .first()
      .click({ force: true });
    cy.readTabledataValidateCSS("1", "0", "justify-content", "flex-end");
    cy.get(widgetsPage.leftAlign)
      .first()
      .click({ force: true });
    cy.readTabledataValidateCSS("1", "0", "justify-content", "flex-start");
  });

  it("Test to validate text format", function() {
    cy.get(widgetsPage.bold).click({ force: true });
    cy.readTabledataValidateCSS("1", "0", "font-weight", "700");
    cy.get(widgetsPage.italics).click({ force: true });
    cy.readTabledataValidateCSS("1", "0", "font-style", "italic");
  });

  it("Test to validate vertical allignment", function() {
    cy.get(widgetsPage.verticalTop).click({ force: true });
    cy.readTabledataValidateCSS("1", "0", "align-items", "flex-start");
    cy.get(widgetsPage.verticalCenter)
      .last()
      .click({ force: true });
    cy.readTabledataValidateCSS("1", "0", "align-items", "center");
    cy.get(widgetsPage.verticalBottom)
      .last()
      .click({ force: true });
    cy.readTabledataValidateCSS("1", "0", "align-items", "flex-end");
  });

  it("Test to validate text color and text background", function() {
    cy.get(widgetsPage.textColor)
      .first()
      .click({ force: true });
    cy.xpath(widgetsPage.greenColor).click();
    cy.wait(5000);
    cy.wait("@updateLayout");
    cy.readTabledataValidateCSS("1", "0", "color", "rgb(41, 204, 163)");
    cy.get(widgetsPage.toggleJsColor).click();
    cy.testCodeMirrorLast("purple");
    cy.wait("@updateLayout");
    cy.readTabledataValidateCSS("1", "0", "color", "rgb(128, 0, 128)");
    cy.get(widgetsPage.backgroundColor)
      .first()
      .click({ force: true });
    cy.xpath(widgetsPage.greenColor).click();
    cy.wait("@updateLayout");
    cy.readTabledataValidateCSS(
      "1",
      "0",
      "background",
      "rgb(41, 204, 163) none repeat scroll 0% 0% / auto padding-box border-box",
    );
    cy.get(widgetsPage.toggleJsBcgColor).click();
    cy.testCodeMirrorLast("purple");
    cy.wait("@updateLayout");
    cy.readTabledataValidateCSS(
      "1",
      "0",
      "background",
      "rgb(128, 0, 128) none repeat scroll 0% 0% / auto padding-box border-box",
    );
  });
});
