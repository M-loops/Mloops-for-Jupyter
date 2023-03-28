define([
    'base/js/namespace',
    'jquery',
    'notebook/js/outputarea',
    'notebook/js/codecell',
    'notebook/js/cell'
], function (Jupyter, $, OutputArea, CodeCell, Cell) {

    python_mssql_bridge = `
    import pyodbc 
    import pandas as pd
    import json
    
    # Define the connection details
    server = 'mloops.database.windows.net'
    database = 'mloops'
    username = 'readonlyuser'
    password = 'pwMloops2'
    driver = '{ODBC Driver 17 for SQL Server}' # Make sure to use the correct driver version
    
    # Establish the connection
    cnxn = pyodbc.connect(f'DRIVER={driver};SERVER={server};DATABASE={database};UID={username};PWD={password}')
    
    def get_models():
        cursor = cnxn.cursor()
        cursor.execute('SELECT ModelId, modelName FROM models')
        rows = cursor.fetchall()
        
        modified_rows = []
        for row in rows:
            row_to_list = [elem for elem in row]
            modified_rows.append(row_to_list)
    
        return json.dumps(modified_rows)
    
    print(get_models())
    `

    function executePython(python) {
        return new Promise((resolve, reject) => {
            var isResolved=false;
            var callbacks = {
                iopub: {
                    output : (data)=>{                              
                       var content = data.content;
                       switch(content.name){
                           case 'stderr':      
                               if(isResolved){
                                   var message = 'Could not handle strr output while executing Python code '
                                               +'because Promise already has been resolved:\n' + content.text;
                                   console.error(message);
                               }                                   
                               reject(content.text);
                               break;
                           case 'stdout':
                               if(isResolved){
                                   var message = 'Could not handle stout output while executing Python code '
                                               +'because Promise already has been resolved:\n' + content.text;
                                   console.error(message);
                               }   
                               resolve(content.text);                                                                          
                               break;                                          
                           case undefined:
                               reject(content.ename + ': ' + content.evalue);  
                               break;                                                                  
                           default:
                               throw new Error('Not yet implemented content type "' + content.name + '"');
                       }
                    }
                }
            };
            Jupyter.notebook.kernel.execute(`${python}`, callbacks);    
        });
    }

    var open_window = function () {

        if (!Jupyter.notebook || !Jupyter.notebook._fully_loaded) {
            setTimeout(open_window, 100);
            return;
        }

        var cell = Jupyter.notebook.get_selected_cell();
        var cellCode = cell.get_text();
        col_query = `
        import json
        ls = `+ cellCode + `.columns.values.tolist()
        ls.insert(0, '')
        fs =[]
        for i in ls:
            fs.append([i,i])
        print(json.dumps(fs))
        `
        executePython(col_query).then(function(out2) { 
            var queryResult2 = JSON.parse(out2);
            window.select2 = $('<select id="selectColumn1"></select>')
            .css({
                'margin-bottom': '10px',
            });
            $.each(queryResult2, function (index, dataframe2) {
                var option2 = $('<option></option>')
                    .val(dataframe2[1])
                    .text(dataframe2[0]);
                window.select2.append(option2);

            }); 
        });

        executePython(python_mssql_bridge).then(function(out) { 
            queryResult = JSON.parse(out);

            var cell = Jupyter.notebook.get_selected_cell();
            var output_area = cell.output_area;
            var window_div = $('<div></div>')
                .css({
                    'position': 'relative',
                    'padding': '10px',
                    'background-color': '#f9f9f9',
                    'border': '1px solid #ddd',
                    'margin-top': '10px',
                });

            // start of model dropdown
            //
            var select = $('<select id="selectColumn"></select>')
                .css({
                    'margin-bottom': '10px',
                });
            $.each(queryResult, function (index, dataframe) {
                var option = $('<option></option>')
                    .val(dataframe[0])
                    .text(dataframe[1]);
                select.append(option);
                
            });

            var randId = parseInt(1000000*Math.random());
            // Add an 'OK' button to the window
            var ok_button = $('<button id="submitModelBtn' + randId + '">OK</button>')
                .css({
                    'display': 'block',
                    'margin-top': '10px',
                });
            
            window_div.append(select, window.select2 ,ok_button);
            
            /*// Display the first dataframe as a default
            if (dataframes.length > 0) {
                var html = $('<div></div>').append(dataframes[0].html_table);
                window_div.append(html);
            }
            //end of model dropdown
            */


            var html = $('<div id="outputPlaceholder' + randId + '"></div>')
            window_div.append(html);
            output_area.append_output({
                output_type: 'display_data',
                data: {'text/html': window_div.html()},
                metadata: {},
            });

            setTimeout(function() {
                document.getElementById("submitModelBtn" + randId).onclick = function() {
                    var cell = Jupyter.notebook.get_selected_cell();
                    var cellCode = cell.get_text();
                    var index = Jupyter.notebook.get_selected_index();
                    Jupyter.notebook.insert_cell_below('code', index).set_text('mloops_data');
                    Jupyter.notebook.select(index+1);
                    Jupyter.notebook.focus_cell();
                    selectedModel = document.getElementById("selectColumn").value;
                    window.selectedTarget = String(document.getElementById("selectColumn1").value);

                    for (res in queryResult) {
                        if (queryResult[res][0] == selectedModel) {
                            window.qr = queryResult
                            var model_id = queryResult[res][0];
                            var pycode = `
                            mloops_data =  `+ cellCode + `
                            import pyodbc 
                            import pandas as pd
                            import numpy as np
                            import json
                            import random
                            from scipy import stats 
                            
                            # Define the connection details
                            server = 'mloops.database.windows.net'
                            database = 'mloops'
                            username = 'readonlyuser'
                            password = 'pwMloops2'
                            driver = '{ODBC Driver 17 for SQL Server}' # Make sure to use the correct driver version
                            
                            # Establish the connection
                            cnxn = pyodbc.connect(f'DRIVER={driver};SERVER={server};DATABASE={database};UID={username};PWD={password}')
                            cursor = cnxn.cursor()
                            cursor.execute("""select re.recommendationName, re.recommendationFunc, i.insightname, r.Score, r.threshold, i.InsightShowfunc, i.Insightfunc, r.IsNum
                            from Rules as r
                            join Insight as i on r.Insightid=i.Insightid
                            join Recommendation as re on  re.RecommendationId=r.RecommendationId
                            where r.modelId="""+ str(`+ model_id + `) +" order by r.Score desc")
                            
                            
                            def form(func,table ,var, tar):
                                rand_i = str(random.randint(0,99999))
                                return func.replace('$$',"'"+var+"'").replace('$',table + "['"+var+"']").replace('#',table + "['"+tar+"']").replace('@',table).replace('~',table + "['"+var+"_"+rand_i+"']")

                            target_='`+ window.selectedTarget + `'
                            
                            # Formating
                            for var in mloops_data.columns:
                                try:
                                    mloops_data["mloops_dt"] = pd.to_datetime(mloops_data[var])
                                    mloops_data["mloops_dt_year"] = mloops_data["mloops_dt"].dt.year
                                    mloops_data["mloops_dt_month"] = mloops_data["mloops_dt"].dt.month
                                    mloops_data["mloops_dt_day"] = mloops_data["mloops_dt"].dt.day
                                    mloops_data["mloops_dt_hour"] = mloops_data["mloops_dt"].dt.hour
                                except:
                                    continue
                            
                            # Creating the table
                            rows = cursor.fetchall()
                            table_ =[]
                            for row in rows:
                                if ('$' not in row[1]):
                                    row_to_list = {"Variable" : "All" ,"Insight Name": row[2], "Insight Graph": '',"Recommendation Name": row[0], "Add Recommendation": form(row[1],f'{mloops_data=}'.split('=')[0],'',target_)}
                                    table_.append(row_to_list)
                                elif (row[7]):
                                    for variable_ in mloops_data.select_dtypes(include=np.number).columns.tolist():
                                        if (row[5]== ''):
                                            graph = ''
                                        else:
                                            graph = str(eval(form(row[5],f'{mloops_data=}'.split('=')[0],variable_,target_)))
                                        if(eval(form(row[6],f'{mloops_data=}'.split('=')[0],variable_,target_)+ row[4])):
                                            row_to_list = {"Variable" : variable_ ,"Insight Name": row[2], "Insight Graph": graph,"Recommendation Name": row[0], "Add Recommendation": form(row[1],f'{mloops_data=}'.split('=')[0],variable_,target_)}
                                            table_.append(row_to_list)
                                else:
                                    
                                    for variable_ in mloops_data.select_dtypes(exclude=np.number).columns.tolist():
                                        if (row[5]== ''):
                                            graph = ''
                                        else:
                                            graph = str(eval(form(row[5],f'{mloops_data=}'.split('=')[0],variable_,target_)))
                                        if(eval(form(row[6],f'{mloops_data=}'.split('=')[0],variable_,target_) + row[4])):
                                            row_to_list = {"Variable" : variable_ ,"Insight Name": row[2], "Insight Graph": graph,"Recommendation Name": row[0], "Add Recommendation": form(row[1],f'{mloops_data=}'.split('=')[0],variable_,target_)}
                                            table_.append(row_to_list)
                            print(json.dumps(table_))
                            `
                            console.log(pycode)
                            executePython(pycode).then(function(out) {  
                                queryResult = JSON.parse(out);                                  
                                // Builds the HTML Table out of myList.
                                function createTableFromJSON(jsonData) {
                                    var table = document.createElement('table');
                                    var thead = document.createElement('thead');
                                    var tbody = document.createElement('tbody');
                                    var tr = document.createElement('tr');
                                    
                                    // create table header
                                    for (var key in jsonData[0]) {
                                        var th = document.createElement('th');
                                        th.innerHTML = key;
                                        tr.appendChild(th);
                                    }
                                    thead.appendChild(tr);
                                    table.appendChild(thead);
                                    window.btn_ids=[];
                                    // create table body
                                    counter = 0;
                                    for (var i = 0; i < jsonData.length; i++) {
                                        var tr = document.createElement('tr');
                                        for (var key in jsonData[i]) {
                                            var td = document.createElement('td');
                                            if (key == "Add Recommendation"){
                                                var btn = document.createElement('button');
                                                btn.setAttribute('id',counter);
                                                window.btn_ids.push(counter)
                                                btn.innerHTML = jsonData[i][key];                                 
                                                td.appendChild(btn);

                                            }
                                            else if (key == "Insight Graph"){
                                                td.innerHTML = jsonData[i][key];
                                            }
                                            else{
                                                td.innerHTML = jsonData[i][key];
                                            }
                                            tr.appendChild(td);
                                            counter = counter+1;

                                        }
                                        tbody.appendChild(tr);

                                    }
                                    table.appendChild(tbody);
                                    document.getElementById("outputPlaceholder"+randId).innerHTML = table.outerHTML;
                                    window.cell = Jupyter.notebook.get_selected_cell();
                                    window.index = Jupyter.notebook.get_selected_index()+1;

                                    for (var key in window.btn_ids) {
                                        Jupyter.notebook.select(window.index);                                    
                                        Jupyter.notebook.focus_cell();
                                        cell_i = Jupyter.notebook.get_selected_cell();
                                        document.getElementById(window.btn_ids[key]).onclick = function() {
                                        var text = cell_i.get_text() + "\n" + document.getElementById(this.id).innerHTML;
                                        cell_i.set_text(text);
                                    } 
                                   
                                }
                                    return table.outerHTML;
                                }
                                createTableFromJSON(queryResult) 

                                //document.getElementById("outputPlaceholder"+randId).innerHTML = queryResult;

                            }, function(reject) { console.log(reject); })

                            // out is the python's output. It can be in any format.
                            // See line 58 where I got the output as JSON so it will be easier for me to parse with js.
                        }
                    }
                }
            },100);
            /*output_area.append_output({
                output_type: 'display_data',
                data: {'text/html': window_div.html()},
                metadata: {},
            });*/

        });

        

    };

    var add_button = function () {
        Jupyter.toolbar.add_buttons_group([{
            'label': 'Mloops',
            'icon': 'fa-bar-chart-o',
            'callback': open_window,
            'id': 'mloops',
        }]);
    };

    var load_extension = function () {
        add_button();
        console.log('Extension loaded');
    };

    return {
        load_ipython_extension: load_extension,
    };
});
