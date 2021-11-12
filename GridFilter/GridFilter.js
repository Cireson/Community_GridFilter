// Grid Filter
//loadScript("/CustomSpace/GridFilter/GridFilter.js",['/View/','/Page/']);

// Contributors: Joivan, Geoff Ross
// Description: Adds a custom search bar to pages with a grid view. searches and filters through most columns of that grid for the provided text using OOB filters.
$(document).ready(function () {

    //declare our function before we bind it to our ajax complete event. Important.
    var filterHookFunction = function() {
        //Check for our grid. If it exists then unbind this function and add the filter.
        var gridElement = $('.k-grid-header'); // Get the grid object
        if (gridElement.length > 0) {
            $(document).unbind("ajaxComplete", filterHookFunction);
            addCustomFilterInputsToPage();
        }
    };

    app.events.subscribe('gridBound', filterHookFunction);

    function addCustomFilterInputsToPage() {

        if ($('.customgridsearch').length > 0) {
            return; //another event already added our custom filter.
        }

        if ($('.odata-search-toolbar').length > 0) {
            return; //o-data page, no need for filter
        }

        var shouldPrependText = false;
        var isPromotedView = false; //controls filtering options.

        var resetViewButtonParentDiv = $('.btn-clear-grid-filters').parent(); //could be multiple grids.
        if (resetViewButtonParentDiv.length > 0) {
            //We shouldn't use this for a promoted view. Only OOB views.
            var url = window.location.href;
            if (url.indexOf("/View/") > -1 && url.indexOf("/c5161e06-2378-4b44-aa89-5600e2d3b9d8") == -1 &&
                url.indexOf("/9a06b0af-2910-4783-a857-ba9e0ccb711a") == -1 && url.indexOf("/cca5abda-6803-4833-accd-d59a43e2d2cf") == -1 &&
                url.indexOf("/f94d43eb-eb42-4957-8c48-95b9b903c631") == -1 && url.indexOf("/62f452d5-66b5-429b-b2b1-b32d5562092b") == -1
                ) {
                //console.log("Custom Grid View filter - detected promoted view.");
                isPromotedView = true;
            }
        }
        else {
            //There was no button with this grid? Try a widget view then.
            resetViewButtonParentDiv = $('a:contains("Reset State")').parent().parent(); //Add another parent.  //could be multiple grids.
            shouldPrependText = true;
        }

        if (resetViewButtonParentDiv.length == 0) {
            console.log("Gridview search error: Found a grid view, but not a reset button. Cannot show search filter in this scenario.");
            return;
        }

        resetViewButtonParentDiv.each(function(index) {

            var thisResetViewButtonParentDiv = this;
            var strThisGridSearchId = "customgridsearch_" + index;

            var strHtmlToAdd = "<div class='customgridsearch' style='display: -webkit-inline-box;display: inline-flex;'>" +
                                        "<span class='odata-search-toolbar k-textbox k-space-right'>" +
                                            "<input type='text' id='" + strThisGridSearchId + "' placeholder='Search...' />" +
                                            "<a class='k-icon k-i-search ci-search'></a>" +
                                        "</span>" +
                                    "</div>";

            //console.log("Appending grid view filter " + strThisGridSearchId);
            if (shouldPrependText) {
                $(thisResetViewButtonParentDiv).prepend(strHtmlToAdd);
            }
            else {
                $(thisResetViewButtonParentDiv).append(strHtmlToAdd);
            }

            $('#' + strThisGridSearchId).on('keydown', function(e){
                if(e.which == 13 || e.which == 27) {
                    var htmlGridViewElement = $(thisResetViewButtonParentDiv).parent().parent().find('[data-role=grid]'); //two parents with a child 'find' will account for both dashboards and widgets.
                    if (htmlGridViewElement.length == 0) { //Get it another way depending on customizations.
                        htmlGridViewElement = $(e.currentTarget).closest('[data-role=grid]');
                    }
                    if (htmlGridViewElement.length != 1) {
                        console.log("Gridview search error: Found " + htmlGridViewElement.length + " grids to apply data source filters to for " + strThisGridSearchId + ".");
                    }
                    else if(e.which == 13) {
                        //filter our resultset.
                        var strFilterText = $('#' + strThisGridSearchId).val().trim();
                        if (strFilterText.length > 0) {
                            applyCustomFilterToGridDataSource(htmlGridViewElement, strFilterText, isPromotedView);
                        } else {
                            $('#' + strThisGridSearchId).val("");
                            removeCustomFiltersOnGridResultSet(htmlGridViewElement);
                        }
                    }
                    else if (e.which == 27) {//escape
                        //Clear the resultset.
                        $('#' + strThisGridSearchId).val("");
                        removeCustomFiltersOnGridResultSet(htmlGridViewElement);
                    }
                }
            });

            $('#customgridsearch_0').siblings('a.k-i-search').on("click",function(e) {
                var htmlGridViewElement = $(thisResetViewButtonParentDiv).parent().parent().find('[data-role=grid]'); //two parents with a child 'find' will account for both dashboards and widgets.
                if (htmlGridViewElement.length == 0) { //Get it another way depending on customizations.
                    htmlGridViewElement = $(e.currentTarget).closest('[data-role=grid]');
                }
                if (htmlGridViewElement.length != 1) {
                    console.log("Gridview search error: Found " + htmlGridViewElement.length + " grids to apply data source filters to for " + strThisGridSearchId + ".");
                }
                //filter our resultset.
                var strFilterText = $('#' + strThisGridSearchId).val().trim();
                if (strFilterText.length > 0) {
                    applyCustomFilterToGridDataSource(htmlGridViewElement, strFilterText, isPromotedView);
                } else {
                    $('#' + strThisGridSearchId).val("");
                    removeCustomFiltersOnGridResultSet(htmlGridViewElement);
                }
            });
        });
    }

    function applyCustomFilterToGridDataSource(htmlGridViewElement, strFilterValue, isPromotedView) {
        var kendoGridElement = htmlGridViewElement.data('kendoGrid'); //...as a kendo widget
        var datasource = kendoGridElement.dataSource;

        var criteriaFilterObjects = []; //empty, for now...

        var firstColumn = "";

        for(var i = 0; i < kendoGridElement.columns.length; i++) {
            var strFieldLower = kendoGridElement.columns[i].field.toLowerCase();

            if (strFieldLower == "icon" || strFieldLower == "numericid" || strFieldLower == "baseid" || strFieldLower == "parentworkitemid" || strFieldLower == "basemanagedentityid")
                continue;

            if (strFieldLower.indexOf("date") > -1 || strFieldLower.indexOf("days") > -1 || strFieldLower == "created" || strFieldLower == "lastmodified" ) {
                continue;
            }

            if (strFieldLower.indexOf("workitemtype") > -1 ) { //Ignore dangerous columsn that can force the filter to return zero results. Tacky workaround
                continue;
            }

            if (firstColumn == "") {
                //Set the first real column, since we need any column to work with for our kendo datasource OR filter later.
                firstColumn = kendoGridElement.columns[i].field;
            }

            if (kendoGridElement.columns[i].DataType == "string" || kendoGridElement.columns[i].DataType == "anchor" ||
                (kendoGridElement.columns[i].DataType == undefined && kendoGridElement.columns[i].field.indexOf("Key") == -1)) {

                //when using a filter, the "contains" operator only works with strings, or else it throws a server 500 error.
                //an undefined datatype is a SQL table view from custom SQL source, It still chokes on integers. And we can't guess the type from the column from here?

                var newSingleFilterObject1 = { field: kendoGridElement.columns[i].field, operator: "isnotnull"}; //allows the filters to work properly with OOB grids.
                var newSingleFilterObject2 = { field: kendoGridElement.columns[i].field, operator: "contains", value: strFilterValue };
                var thisColumnFilter = {
                    logic: "and",
                    filters: [
                        newSingleFilterObject1,
                        newSingleFilterObject2
                    ]
                };

                criteriaFilterObjects.push(thisColumnFilter); //add it to our criteriaFilterObjects
            }
        }

        //kendogridview datasources don't allow us to use an OR directly on them. So instead, do an AND, with a nested OR.
        //In the case, the first valid column is not null, AND any other column contains the filtered data.

        var masterFilter = {
            logic: "and",
            filters: [
                {
                    logic:"or",
                    filters: criteriaFilterObjects
                },
                {
                    field: firstColumn,
                    operator: "neq",
                    value: ""
                }
            ] //isnotnull doesn't work with this kendo filter?
        };

        //Set our new filter.
        if (isPromotedView ) {
            //In some promoted views, the kendo filter is broken. If column 6 has a null value, then the OR clause removes that entire result, even if another column matches. This is bypassed by using client-side filtering.
            console.log("Promoted views that were promoted from the console probably will not show all valid results.");
            datasource.options.serverFiltering = true; //For best results, this should be false, but v9.3.x+ seems to have broken this.
            datasource.options.serverPaging = true;
        }
        else { //OOB views and dashboard views. For OOB views, client-side filter works if the not null filter is used as a criteria above.
            datasource.options.serverFiltering = false; //For best results, this should be false, but v9.3.x+ seems to have broken this.
            datasource.options.serverPaging = false;
        }

        datasource.filter(masterFilter);
    }

    function removeCustomFiltersOnGridResultSet(htmlGridViewElement) {
        var kendoGridElement = htmlGridViewElement.data('kendoGrid'); //...as a kendo widget
        var datasource = kendoGridElement.dataSource;

        datasource.filter([]);
    }

});