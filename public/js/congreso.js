/** 
 * This file is part of CongrESo
 * (Spanish Congress, an interactive visualization)
 * https://github.com/aluarosi/congreso
 * 
 * Copyright (C) 2014 Alvaro Santamaria Herrero (aluarosi)
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

// Module Pattern

//Namespace
var CONGRESO = (function(jquery, _, d3){
  console.log("CONGRESO loaded");


  //
  // Common Scope
  // 
  // Let's use $ for our SCOPE
  var $ = { // Shared scope;
    //
    // CONSTANTS
    //
    W_GIF : 536, // Original dimensions of scraped diagram
    H_GIF : 393, // "
    R : 536.0/393.0, // Aspect ratio

    VIEW_GROUP : 0,  // Seats colored by Congress Group
    VIEW_SALARY : 1, // Seats colored by salary
    VIEW_GENDER : 2,    // Seats colored by sex

    COLOR_GROUP : {
      "Popular" : "#44f",
      "Socialista" : "#d00",
      "Vasco (EAJ-PNV)" : "#0a0",
      "Catalán  (CiU)" : "#fa0",
      "Unión Progreso y Democracia" : "#e0e",
      "La Izquierda Plural" : "#a0f",
      "Mixto" : "#0dd"
    },
    SHORTEN_GROUP : {
      "Popular" : "PP",
      "Socialista" : "PSOE",
      "Vasco (EAJ-PNV)" : "EAJ-PNV",
      "Catalán  (CiU)" : "CiU",
      "Unión Progreso y Democracia" : "UPyD",
      "La Izquierda Plural" : "IU",
      "Mixto" : "Mixto"
    },
    COLOR_GENDER : {
      "F" : "#f0f",
      "M" : "#0ff",
      "Tod@s" : "silver" //Both genders
    },
    EXTEND_GENDER : {
      "F" : "Diputadas",
      "M" : "Diputados",
      "Tod@s" : "Total" //Both genders
    },
    /*
    COLOR_SALARY : {
      50000 : "green",
      //85000 : "yellow",
      85000 : "orange",
      120000 : "red",
      190000 : "purple"
    },
    */
    /*
    COLOR_SALARY : {
      50000 : "#fee5d9",
      85000 : "#fcae91",
      120000 : "#fb6a4a",
      190000 : "#cb181d"
    },
    Taken from http://colorbrewer2.org/
    */
    COLOR_SALARY : {
      60000 : "#fee0d2",
      95000 : "#fc9272",
      120000 : "#de2d26"
    },
    LEGEND_ID : [
      // This order has to match VIEW_ constants
      "#legend-group",
      "#legend-salary",
      "#legend-gender"
    ],
    LOCALE : d3.locale({
      "decimal": ",",
      "thousands": ".",
      "grouping": [3],
      "currency": ["$", ""],
      "dateTime": "%a %b %e %X %Y",
      "date": "%m/%d/%Y",
      "time": "%H:%M:%S",
      "periods": ["AM", "PM"],
      "days": ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"],
      "shortDays": ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"],
      "months": ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
      "shortMonths": ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
    }),
    BACKGROUND_IMAGE : "/img/IMG_2130.png",
    //
    // Data sources
    //
    data_seats : null, // This is an object
    data_wages : null, // This is an object
    data_merged : null, // This is a LIST
    data_names : null, // List of all politician's names
    data_selected_names : null, // List of selected politician's names (ranking filter)
    data_fixed_names : null, // List of fixed politician's names (in ranking)
    data_total : null, // Total salary per year (sum all MPs)
    data_average : null, // Average salary per year (all MPs)
    data_median : null, // Median salary
    data_max : null,
    data_min : null,
    data_averaged_by_gender : null,
    data_averaged_by_group : null,
    //
    // Visualization
    //
    container : null, // Main containing div in DOM
    W : null, // Main container, width
    H : null, // Main container, height 
    W_chamber : null, // Chamber diagram, width
    H_chamber : null, // Chamger diagram, height
    adjustCoords : null, // Scale for adjusting original seat coords
    svg : null,  // svg root element for congress graph 
    seats : null,    // svg:g element for containing seats
    infobox : null, // svg:g element for containing info
    infoext : null, // div element for containing extended info
    ranking_list : null, // div element for containing ranking list
    ranking_filter : null, // ranking filter input box
    ranking_filter_submit : null, // ranking filter submit button
    total_diagram : null, // for total salaries
    average_gender_diagram : null,
    average_group_diagram : null,
    averages : null, 
    body : null,
    ranking : null,
    // Scales
    color_gradient : null,
    //
    // State
    //
    selected_seat : null,
    selected_seat_locked : false, 
    selected_view : null,
  };

  //
  // Template functions
  //    init() --> setup() --> resize() --> join --> update()
  //
  function init() {
    console.log("Init");

    loadData(function(data){
      $.data_seats = data.seats; // This is an object
      $.data_wages = data.wages; // This is an object
      console.log(data);

      // 
      // PREPARE DATA
      //
      // Merge wages (from data_wages) into data_seats (master source)
      $.data_merged = _.object(_.map(_.values($.data_seats), function(item, key){
        var r =  [item.name, _.extend(item, $.data_wages[item.name])];
        // TODO if (!r[1].salary_year) debugger;

        return r;
      }));
      // Selected names in ranking list
      $.data_selected_names = _.object(_.map($.data_merged, function(v,k){
        return [k,true];
      }));
      // Fixed names in ranking list
      $.data_fixed_names = _.object(_.map($.data_merged, function(v,k){
        return [k,false];
      }));

      // Calculate SALARY by COMPONENTS
      // Make this OPTIONAL: this overrides salary_year with calculated salary (from components)
      function add_salary_calculations(politician_object){
        // Adds calculated salary info to each politician in data_wages list
        /*
        Abad Pérez, Juan Antonio: Object
            foto_src: "http://www.congreso.es/wc/htdocs/web/img/diputados/peq/87_10.jpg"
            gender: "M"
            group: "Popular"
            name: "Abad Pérez, Juan Antonio"
            page: "http://www.congreso.es/portal/page/portal/Congreso/Congreso/Diputados/BusqForm?_piref73_1333155_73_1333154_1333154.next_page=/wc/fichaDiputado&idDiputado=87&idLegislatura=10"
            province: "La Rioja"
            role_or_group: "GP"
            salary_components: Object
            salary_year: 64928
            seat_code: "3818"
            seat_coords: Array[2]
        */

        // CONFIG
        var MONTHLY_COMPONENTS = {
          TODOS :  2813.87,
          MP : 9121.03,
          MV : 2927.53,
          MS : 2440.3,
          GPO: 2667.5,
          GPA: 2087.07,
          CP : 1431.31,
          CV : 1046.48,
          CS : 697.65,
          CPO: 1046.48,
          CPA: 697.65,
          MADRID : 870.56,
          OTRAS_PROV : 1823.86
        };
        var N_MONTHS = 14;
       
        // Let's make a SHALLOW copy...
        var new_object = _.clone(politician_object);
        // Save salary_year before calculating and overriding
        new_object.salary_year_old = politician_object.salary_year;
        new_object.salary_year_calculated = null;
        new_object.salary_month__base = MONTHLY_COMPONENTS.TODOS;
        new_object.salary_month__mesa = null;
        new_object.salary_month__grupo = null;
        new_object.salary_month__comision = null;
        new_object.salary_month__provincia = null;
        new_object.salary_month = null;
        
        function calculate_salary_mesa(salary_components){
          var o = _.pick(salary_components, "MP", "MV", "MS");
          var num_positions = _.filter(o, function(v,k){return v});
          if (num_positions > 1) console.log("ERROR: More than 1 position in MESA CONGRESO", politician_object.name);
          var mesa_monthly_salary = 0;
          if ( o.MP ) {
            mesa_monthly_salary +=  MONTHLY_COMPONENTS.MP;
          } else if ( o.MV ) {
            mesa_monthly_salary +=  MONTHLY_COMPONENTS.MV;
          } else if (o.MS ) {
            mesa_monthly_salary +=  MONTHLY_COMPONENTS.MS;
          }
          return mesa_monthly_salary;
        };
        new_object.salary_month__mesa = calculate_salary_mesa(new_object.salary_components);

        function calculate_salary_grupo(salary_components){
          var o = _.pick(salary_components, "GPO", "GPA");
          var num_positions = _.filter(o, function(v,k){return v});
          if (num_positions > 1) console.log("ERROR: More than 1 position in GRUPO CONGRESO", politician_object.name);
          var grupo_monthly_salary = 0;
          if ( o.GPO ) {
            grupo_monthly_salary +=  MONTHLY_COMPONENTS.GPO;
          } else if ( o.GPA ) {
            grupo_monthly_salary +=  MONTHLY_COMPONENTS.GPA;
          }
          return grupo_monthly_salary;
        };
        new_object.salary_month__grupo = new_object.salary_month__mesa ? 0 : calculate_salary_grupo(new_object.salary_components);

        function calculate_salary_comision(salary_components){
          var o = _.pick(salary_components, "CP", "CV", "CS", "CPO", "CPA");
          // Several positions are allowed, only the highest contributes to salary 
          var comision_monthly_salary = 0;
          if ( o.CP ) {
            comision_monthly_salary +=  MONTHLY_COMPONENTS.CP;
          } else if ( o.CV || o.CPO ) {
            comision_monthly_salary +=  MONTHLY_COMPONENTS.CV;
          } else if ( o.CS || o.CPA ) {
            comision_monthly_salary +=  MONTHLY_COMPONENTS.CS;
          } 
          return comision_monthly_salary;
        };
        //new_object.salary_month__comision = new_object.salary_month__mesa ? 0 : calculate_salary_comision(new_object.salary_components);
        // 20150227 --> It seems that Mesa's members can also receive money from Comisiones
        new_object.salary_month__comision = calculate_salary_comision(new_object.salary_components);

        function calculate_salary_provincia(salary_components){
          var o = _.pick(salary_components, "Madrid");
          var provincia_monthly_salary = 0;
          if ( o.Madrid ) {
            provincia_monthly_salary +=  MONTHLY_COMPONENTS.MADRID;
          } else {
            provincia_monthly_salary +=  MONTHLY_COMPONENTS.OTRAS_PROV;
          } 
          return provincia_monthly_salary;
        };
        new_object.salary_month__provincia = calculate_salary_provincia(new_object.salary_components);

        // SUM UP Salary
        new_object.salary_month = 
          new_object.salary_month__base +
          new_object.salary_month__mesa + 
          new_object.salary_month__grupo + 
          new_object.salary_month__comision + 
          new_object.salary_month__provincia
        ;
        new_object.salary_year_calculated = N_MONTHS * new_object.salary_month;
        new_object.salary_year = new_object.salary_year_calculated; 

        // WARNINGS if differences are detected
        if (Math.abs(new_object.salary_year_calculated - new_object.salary_year_old) > 0.0001 ) {
          console.log("ERROR in calculated SALARY for ", new_object.name, 
            new_object.salary_year_calculated, new_object.salary_year_old);
        } else {
          console.log("OK", new_object.name);
        };
    
        // TODO: UGLY but Fast hack, let's recalculate the photo URL with a "safer" url
        var url_regex = /\/peq/;
        new_object.foto_src = politician_object.foto_src.replace("/peq",""); 

        return new_object;
      };
      // Rebind data_merged
      $.data_merged = _.object(_.map( $.data_merged, function(v, k){
        return [k, add_salary_calculations(v)];
      }));

      console.log(JSON.stringify( $.data_merged, null, 4 ));

      setup();
    });
  };
  
  function setup(){
    console.log("Setup");

    $.container = document.querySelector("#congress-container");
    $.outer_container = document.querySelector("#outer-container");
    $.adjustCoords = d3.scale.linear()
        .domain([0, $.W_GIF]);
    $.svg = d3.select("svg#parlamento")
    $.seats = $.svg.append("g").attr("id", "seats");
    $.infobox = $.svg.append("g").attr("id", "infobox");
    $.infoext = d3.select("div#info-extended");
    $.ranking_list = d3.select("div#ranking-list");
    $.ranking_filter = d3.select("input#ranking-filter");
    $.ranking_filter_submit = d3.select("span#ranking-filter-submit");
    $.total_diagram = d3.select("div#total");
    $.average_gender_diagram = d3.select("div#average-gender");
    $.average_group_diagram = d3.select("div#average-group");
    $.averages = d3.select("div#averages");
    $.body = d3.select("body");
    $.ranking = d3.select("#ranking");
    
    $.selected_view = $.VIEW_SALARY;

    // Scales
    $.color_gradient = d3.scale.linear()
      .domain(_.keys($.COLOR_SALARY))
      .range(_.values($.COLOR_SALARY))
    ;


    // 
    // Event Listeners
    //
    // Navigation
    var n = d3.selectAll("ul#navigation-tabs li")
      .on("click", function(d,i){
        // Call selectNav() with element's id
        selectNav( d3.select(this).attr("id") ); 
      })
    ;
    // View selector
    d3.selectAll("#buttons")
      .on("change", function(d,i){
        selectView(i);
      })
      .on("click", function(){
        // Hints came from 
        // http://stackoverflow.com/questions/18003183/bootstrap-3-radio-button
        var i = d3.select(d3.event.target).select("input").attr("name");
        selectView(i);
      })
    ;
    // Diagram background (unselect politician)
    $.svg
      .on("click", function(d,i){
        unLockSeat();
        unselectSeat(null, this); 
      })
    ;
    // Filtro ranking
    /*
    $.ranking_filter
      .on("input", function(d,i){
        var query = this.value;
        filterRanking(query);
      })
    ;
    */
    $.ranking_filter_submit
      .on("click", function(d,i){
        var query = $.ranking_filter.node().value;
        filterRanking(query);
      })
    ;

    // Initial Legends & Panels
    selectNav("nav-rank");
    selectLegend($.selected_view);

    // Un-hide some elements
    d3.selectAll(".hidden")
      .classed("hidden", false)
    ;
    
    // Go to resize step
    window.addEventListener("resize", resize);
    resize();
  };

  function resize(){
    console.log("Resize");

    $.W = $.container.clientWidth; 
    $.W_chamber = $.W * 0.95;
    $.H_chamber = $.W_chamber / $.R;
    $.svg
        .attr("width", $.W_chamber)
        .attr("height", $.H_chamber)
    ;
    $.infobox
        .attr("transform", "translate("+0.5*$.W_chamber+","+0.84*$.H_chamber+")");
    
    $.adjustCoords
        .range([0, $.W_chamber]);

    // Adjust ranking list height
    $.ranking_list
        .style("height", function(d,i){
          var my_h =  parseInt($.H_chamber * 1.05);
          return my_h + "px";
        })
        .style("overflow-y", "auto")
    ;
    // Adjust average ranking group height
    $.averages
        .style("height", function(d,i){
          var my_h =  parseInt($.H_chamber * 1.50);
          return my_h + "px";
        })
        .style("overflow-y", "auto")
    ;
    // Adjust general font size for #visual-selector
    $.body
        .style("font-size", function(d,i){
          var h = $.W_chamber/45;
          return h+"px";
        }) 
    ;
    // Next step in the chain
    join();
  }; 

  function join(){
    // Makes the data join (joins data<-->DOM)
    // & setups event listeners
    console.log("join");

    // Get data
    var data = _.values($.data_merged); // Eventually, wage data could be merged into data_seats
    // Sort data by salary
    var data_filtered = _.filter(data, function(d,i){
        return  d.salary_year_old; // Changed after salary calculations from components is introduced
    });
    var data_sorted = _.sortBy(data_filtered, function(item){
      return -item.salary_year;
    });

    //
    // DATA TOTAL & AVERAGE
    //
    $.data_total = _.reduce(data_sorted, function sum(acc, val){
       return acc + val.salary_year;
    }, 0.0);
    $.data_average = $.data_total / data_sorted.length;

    //
    // Calculate here MEDIAN Salary to compare
    //  Median salary is practically the same for men, woman and different groups //
    // 
    $.data_median = d3.median(data_sorted,function(d){return d.salary_year;});
    // MAX and MIN
    $.data_max = d3.max(data_sorted, function(d){return d.salary_year;});
    $.data_min = d3.min(data_sorted, function(d){return d.salary_year;});

    //
    // DATA for AVERAGES
    //
    function average(values){
      // @values is a list
      var sum = _.reduce(values, 
        function(acc, item){
          return acc+item; 
        },
        0.0 
      );
      return parseInt(sum/values.length);
    };
    function averageByField(field_to_average, grouped_by_field){
      // Returns object: keys are values of selected field
      //  and values are averages 
      var g0 = _.groupBy(data_sorted, function(v, k){
        return v[grouped_by_field]; 
      });
      var g1 = _.map(g0, function(v, k){
        return [k, average(_.map(v, function(v,k){return v[field_to_average]}))]; 
      });
      return _.object(g1);
    };
    function medianByField(field_to_calculate_median, grouped_by_field){
      // Returns object: keys are values of selected field
      //  and values are averages 
      var g0 = _.groupBy(data_sorted, function(v, k){
        return v[grouped_by_field]; 
      });
      var g1 = _.map(g0, function(v, k){
        return [k, d3.median(_.map(v, function(v,k){return v[field_to_calculate_median]}))]; 
      });
      return _.object(g1);
    };
    // TODO: WATCH OUT!! Ugly but fast hack, change average by median w/o changing variable names!!!
    // We are aware that this could be confusing!!! WATCH OUT!!
    // Group by gender
    $.data_average_by_gender = _.pairs(averageByField("salary_year", "gender"));
    $.data_average_by_gender = _.pairs(medianByField("salary_year", "gender")); // OVERRIDE!
    // Add total average to by_gender data
    //$.data_average_by_gender.push(["Tod@s", $.data_average]);
    $.data_average_by_gender.push(["Tod@s", $.data_median]); // CHANGED!
    $.data_average_by_group = _.pairs(averageByField("salary_year", "group"));
    $.data_average_by_group = _.pairs(medianByField("salary_year", "group")); // OVERRIDE!
    //var average_by_province = averageByField("salary_year", "province");

    //
    // Once data is sorted, add a rank field
    //
    _.each(data_sorted, function(item, idx){
      item.rank = idx+1; 
    });

    //
    // JOIN for seats diagram
    //
    var seats_selection = $.seats
      .selectAll("circle.seat")
        .data(data_sorted)
    ;
    // Enter
    var seats_enter = seats_selection.enter()
      .append("circle")
        .sort(function comparator(a,b){
          // Let's sort the seats by size (z-index)
          return a.salary_year - b.salary_year;
        })
        .attr("class","seat") 
        .attr("id", function(d,i){return d.name})
        .on("mouseover", function(d,i){
          // Select seat only if selected seat is not locked
          if (!$.selected_seat_locked){
            selectSeat(d.name, this);
          }
        })
        .on("click", function(d,i){
          d3.event.stopPropagation();
          // If clicked seat is selected and locked --> unlock
          if ($.selected_seat_locked && d.name === $.selected_seat){
            unLockSeat();
            unselectSeat(null, this);
          } else {
            selectSeat(d.name, this);
            lockSeat();
          }
        })
    ;

    //
    // JOIN for ranking
    //
    var rank_selection = $.ranking_list
      .selectAll("div.ranking-item")
        .data(data_sorted)
    ;
    // Enter
    var rank_enter = rank_selection.enter()
      .append("div")
        .attr("class", "ranking-item")
    ;

    //
    // JOIN for averages
    //
    var average_gender_selection = $.average_gender_diagram
      .selectAll("div.bar")
        .data($.data_average_by_gender)
    ;
    var average_group_selection = $.average_group_diagram
      .selectAll("div.bar")
        .data($.data_average_by_group)
    ;
    // Enter
    var average_gender_enter = average_gender_selection.enter()
      .append("div")
        .attr("class", "bar")
    ;
    var average_group_enter = average_group_selection.enter()
      .append("div")
        .attr("class", "bar")
    ;

    // 
    // Call DRAW functions
    //
    // Draw once
    drawLegend();
    drawRanking();
    drawAverages();
    // Finally drawAll()
    drawAll();
  };

  function drawAll(){
    console.log("drawAll");

    drawSeats();
    drawInfo();
    drawInfoExtended();
  }; 

  //
  // Specialized functions
  //
  function loadData(cb){
    console.log("LoadData");
    var loaded_data = {
      seats : null,
      wages : null
    };
    // Load data asynchronously
    d3.json(
      "json/chamber_by_politician.json", 
      function(data){
        loaded_data.seats = data;   
        // preload all politician's images (launch now asynchronously)
        /* TODO: re-activate image loading
        _.each(data, function(d,i){
          // Fast hack to preload images TODO: improve this, is not paralel...
          var preloaded_image = new Image();
          preloaded_image.src = d.foto_src;
        });
        */
        collector();
      }
    );
    d3.csv(
      "csv/congreso_refined.csv",  // TODO --> Change this with wages info
      function(d){
        var salary_components = {
          Madrid : d.Madrid.length ? true : false,
          MP : d.MP.length ? true : false,
          MV : d.MV.length ? true : false,
          MS : d.MS.length ? true : false,
          GPO : d.GPO.length ? true : false,
          GPA : d.GPA.length ? true : false,
          CP : d.CP.length ? true : false,
          CV : d.CV.length ? true : false,
          CS : d.CS.length ? true : false,
          CPO : d.CPO.length ? true : false,
          CPA : d.CPA.length ? true : false
        };
        var r =  {
          name : d.NOMBRE,
          salary_year : parseFloat(+d["TOTAL AÑO"]), // + --> fast cohercion into number
          salary_components : salary_components,
          gender : d.SEXO,
          province : d.PROVINCIA
        };
        return r;
      },
      function(err, data){
        // Transform array (of rows) into keyed (by name) object
        var pairs = _.map(data, function(item, idx){
          return [item.name, item];
        });
        loaded_data.wages = _.object(pairs);   
        collector();
      }
    );

    function collector(){
      if (_.every(loaded_data)) cb(loaded_data);
    }
  };

  function selectSeat(name, dom_element){
    console.log("selectSeat");
    $.selected_seat = name;
    drawAll();
  };

  function unselectSeat(name, dom_element){
    console.log("unselectSeat");
    $.selected_seat = null;
    drawAll();
  };

  function drawSeats(){
    console.log("drawSeats");

        
    // Background image
    /*
    $.svg.selectAll("image").remove();
    $.svg.append("svg:image")
        .attr("xlink:href", $.BACKGROUND_IMAGE)
        .attr("width", function(d){return $.W_chamber})
        .attr("height", function(d){return $.W_chamber/$.R});
    ;
    */

    d3.selectAll("circle.seat")
        .sort(function comparator(a,b){
          // z-indez --> Selected seat in front 
          // TODO: This may slow mobile devices... forces to sort/redraw all seats
          // each time a seat is selected
          // TODO: alternative... each seat is a <g>, when selected we paint a circle on the seat??
          if (a.name === $.selected_seat){
            return +10000; 
          } else if (b.name === $.selected_seat){
            return -10000;
          } else {
            return b.rank-a.rank;
          }
        })
        .attr("cx", function(d, i){
          var x = $.adjustCoords(d.seat_coords[0]);
          return x;
        })
        .attr("cy", function(d, i){
          var y = $.adjustCoords(d.seat_coords[1]);
          return y;
        })
        .attr("r", function(d, i){
          var r = $.adjustCoords($.W_GIF/120);
          if ($.selected_seat && $.selected_seat === d.name){
            if ($.selected_seat_locked){
              //r *= 3.0; // Disabled
            } else {
              //r *= 2.0; // Disabled
            }
          }
          // Optional radius modulation according to salary
          // Try out alternatives
          //var f = 0.6 + (d.salary_year_calculated-50000)/(190000-50000)*1.8;
          //var f = 0.3 + (d.salary_year_calculated-50000)/(190000-50000)*3.8;
          var f = 0.5 + (d.salary_year_calculated-50000)/(190000-50000)*3.8;
          //var f = Math.sqrt(d.salary_year_calculated)/Math.sqrt(50000); // Surface is not so obvious
          //var f = d.salary_year_calculated/50000; // Surface is not so obvious

          r = r*f;

          return r;
        })
        .transition(.5)
        .call(colorSeats)
        .style("stroke-width", function(d, i){
          // Outline selected seat
          var r = d3.select(this).attr("r");
          var w = 0;
          if ($.selected_seat && $.selected_seat === d.name){
            if ($.selected_seat_locked){
              w = 0.4;
            } else {
              w = 0.4;
            }
            return w*r;
          } else {
            return 1;
          }
        })
        .style("stroke", function(d, i){
          return "black";
        })
        //.call(outlineSeatsByPosition)
        /*
        .attr("opacity", function(d,i){
          var o = 1.0;
          if ($.selected_seat && $.selected_seat !== d.name && !$.selected_seat_locked){
            o = 0.6;
          }
          return o; 
        })
        */
        .style("cursor", "pointer")
    ;
  };

  function colorSeats(seat_selection){
    console.log("colorSeats");
    
    var mapper={}
    // A literal object def does not work with refs...?
    mapper[$.VIEW_GROUP] = function(d,i){
      var c = $.COLOR_GROUP[d.group]   
      return c;
    };
    mapper[$.VIEW_SALARY] = function(d,i){
      var c = $.color_gradient(d.salary_year);
      return c;
    };
    mapper[$.VIEW_GENDER] = function(d,i){
        
      var c = $.COLOR_GENDER[d.gender];
      return c;
    };

    
    var s = mapper[$.selected_view];
    seat_selection
        .transition() 
        .duration(function(d,i ){
           return 200; 
        })
        .style("fill",s );
  };

  function outlineSeatsByPosition(seat_selection){
    console.log("strokeSeats");

    seat_selection
      .style("stroke", function(d, i){
        var m = d.salary_components;
        if (!m) return;
        var r = "black";
        
        if (m.MP) {
          r = "black";
        } else if (m.MV) {
          r = "DarkGrey";
        } else if (m.MS) {
          r = "grey";
        } else if (m.GPO) {
          r = "black";
        } else if (m.GPA) {
          r = "DarkGrey";
        }
        return r;
      })
      .style("stroke-width", function(d, i){
        var m = d.salary_components;
        if (!m) return;
        var r = 1;
        
        if (m.MP) {
          r = 6;
        } else if (m.MV) {
          r = 6;
        } else if (m.MS) {
          r = 6;
        } else if (m.GPO) {
          r = 4;
        } else if (m.GPA) {
          r = 4;
        }
        return r;
      })
      /*
      .attr("r", function(d, i){
        var r = $.adjustCoords($.W_GIF/120);
        if ($.selected_seat && $.selected_seat === d.name){
          if ($.selected_seat_locked){
            r *= 3.0;
          } else {
            r *= 2.0;
          }
        }
        // Enlarge a little if this is a special position
        var f = 1;
        var m = d.salary_components;
        if (!m){
          f = 1;
        } else if (m.MP) {
          f = 1.3;
        } else if (m.MV) {
          f = 1.3;
        } else if (m.MS) {
          f = 1.3;
        } else if (m.GPO) {
          f = 1.2;
        } else if (m.GPA) {
          f = 1.2;
        }
        r = r * f;
        return r;
      })
      */
    ;

  };

  function drawInfo(){
    console.log("drawInfo");

    var infobox = $.infobox;
    // Delete all inside infobox
    infobox.selectAll(".info").remove();

    var selected_seat = $.selected_seat;
    var selected_politician = $.data_merged[selected_seat];
    if (!selected_politician) return;
  
    //
    // Add info pieces
    // 
    // Name
    var text_h = $.W_chamber/30;
    infobox.append("text")
        .attr("class", "info")
        .html(selected_politician.name)
        .style("text-anchor", "middle")
        .style("font-size", text_h/1.2)
    ; 
    var f = $.LOCALE.numberFormat(",.0f");
    console.log(f(20000));
    infobox.append("text")
        .attr("class", "info")
        .html(f(selected_politician.salary_year)
          +" &euro;/año" )
        .style("text-anchor", "middle")
        .style("font-size", text_h/1.2)
        .attr("transform", "translate(0,"+text_h*1.1+")");
    ; 

    // Photo
    var photo_w = $.W_chamber/6; 
    var photo_h = $.W_chamber/6; 
    infobox.append("svg:image")
        .attr("class", "info")
        .attr(
          "xlink:href", 
          selected_politician.foto_src
        )
        .attr("width", photo_w)
        .attr("height", photo_h)
        .attr("x", function(d,i){
          var x = -photo_w/2;  
          return x;
        })
        .attr("y", function(d,i){
          var y = -photo_w - text_h * 1.5;  
          return y;
        })
        .style("opacity",0.0)
        .transition()
        .style("opacity",1.0)
    ;
  };

  function drawInfoExtended(){
    console.log("drawInfoExtended");

    var infoext = $.infoext;
    // Delete all inside infobox
    infoext.selectAll(".info").remove();

    var selected_seat = $.selected_seat;
    var selected_politician = $.data_merged[selected_seat];
    if (!selected_politician) return;

    //
    // Add info pieces
    // 
    // Name
    var inner = infoext.append("h5")
        .attr("class", "info")
        .style("font-size", $.W/36+"px")
        .style("border-bottom", "1px solid grey")
    ;
    inner
      .append("strong")
      .append("a")
        //.style("color", $.color_gradient(190000))
        .style("color", "black")
        .attr("href", selected_politician.page)
        .attr("target", "_blank")
        .html(selected_politician.name)
    ;
    // Provincia
    inner.append("small")
        .attr("class", "info")
        .style("display", "inline")
        .style("margin", "0.5em")
        .html(selected_politician.province)
    ;
    // Group
    inner.append("small")
        .attr("class", "info")
       .style("margin", "0.5em")
        .style("color", $.COLOR_GROUP[selected_politician.group])
        .html("Grupo "+selected_politician.group)
    ;
    // Sueldo
    var f = $.LOCALE.numberFormat(",.0f");
    var formatted_salary = f(selected_politician.salary_year);
    inner.append("span")
        .attr("class", "info")
        .style("margin", "0.5em")
        .style("font-size", "120%")
        .html(formatted_salary+" &euro;/año")
    ;

    //
    // Salary breakdown
    //
    var breakdown = infoext.append("div")
        .classed("info", true)
    ; 
    breakdown.append("span")
        .text("Salario Base ")
    ;
    breakdown.append("strong")
        .style("font-size", "1.2em")
        .html(f(selected_politician.salary_month__base) + " &euro;/mes")
    ;
    breakdown.append("span")
        .html(" - ")
    ;
    breakdown.append("span")
        .text("Indeminzación Provincia ")
    ;
    breakdown.append("strong")
        .style("font-size", "1.2em")
        .html(f(selected_politician.salary_month__provincia) + " &euro;/mes")
    ;
    breakdown.append("span")
        .html(" - ")
    ;
    if (selected_politician.salary_month__mesa){
      breakdown.append("span")
          .text("Cargo Mesa ")
      ;
      breakdown.append("strong")
          .style("font-size", "1.2em")
          .html(f(selected_politician.salary_month__mesa) + " &euro;/mes")
      ;
      breakdown.append("span")
          .html(" - ")
      ;
    }
    if (selected_politician.salary_month__grupo){
      breakdown.append("span")
          .text("Portavoz Grupo ")
      ;
      breakdown.append("strong")
          .style("font-size", "1.2em")
          .html(f(selected_politician.salary_month__grupo) + " &euro;/mes")
      ;
      breakdown.append("span")
          .html(" - ")
      ;
    }
    if (selected_politician.salary_month__comision){
      breakdown.append("span")
          .text("Cargo Comisión ")
      ;
      breakdown.append("strong")
          .style("font-size", "1.2em")
          .html(f(selected_politician.salary_month__comision) + " &euro;/mes")
      ;
      breakdown.append("span")
          .html(" - ")
      ;
    }
    breakdown.append("span")
        .text("TOTAL ")
    ;
    breakdown.append("strong")
        .style("font-size", "1.2em")
        .html(f(selected_politician.salary_month) + " &euro;/mes")
    ;
    breakdown.append("span")
        .html(" (14 mensualidades) ")
    ;
    
    
    
    
  };

  function drawLegend(){
    // Draw legend 1 time only
    console.log("drawLegend");

    var em = $.W_chamber/50; //Letter size

    // Delete all
    d3.select("div#legend-container").selectAll("div").remove();
    // LEGEND SALARY
    var legend_salary_container = d3.select("div#legend-container")
      .append("div")
        .attr("id", "legend-salary")
        .attr("class", "legend")
        .style("display", "none")
        .style("font-size", em+"px")
    ;
    /*
    legend_salary_container.append("h4")
        .text("Sueldos")
        .style("display", "inline")
        .style("margin-right", em*2+"px")
        .style("font-size", em*1.4+"px")
        .style("font-weight", "400")
    ;
    */
    var legend_salary_items = legend_salary_container.selectAll("div")
        .data(_.pairs($.COLOR_SALARY))
      .enter()
      .append("div")
      .style("display", "inline")
    ;
    legend_salary_items
      .append("svg")
        .attr("width", em*1.1+"px")
        .attr("height", em*1.1+"px")
      .append("circle")
        .attr({
          "r" : em/2,
          "cx" : em/2,
          "cy" : em/2,
        })
        .style("stroke", "grey")
        .style("fill", function(d,i){
          return d[1];
        })
    ;
    legend_salary_items
      .append("span")
        .style("padding-left", em*0.5+"px")
        .style("padding-right", em+"px")
        .html(function(d,i){
          return "< "+d[0]+" &euro;";        
        })
    ;

    // LEGEND GROUPS
    var legend_group_container = d3.select("div#legend-container")
      .append("div")
        .attr("id", "legend-group")
        .attr("class", "legend")
        .style("display", "none")
        .style("font-size", em+"px")
    ;
    /*
    legend_group_container.append("h4")
        .text("Grupos")
        .style("display", "inline")
        .style("margin-right", em*2+"px")
        .style("font-size", em*1.4+"px")
        .style("font-weight", "400")
    ;
    */
    var legend_group_items = legend_group_container.selectAll("div")
        .data(_.pairs($.COLOR_GROUP))
      .enter()
      .append("div")
      .style("display", "inline")
    ;
    legend_group_items
      .append("svg")
        .attr("width", em*1.1+"px")
        .attr("height", em*1.1+"px")
      .append("circle")
        .attr({
          "r" : em/2,
          "cx" : em/2,
          "cy" : em/2,
        })
        .style("stroke", "grey")
        .style("fill", function(d,i){
          return d[1];
        })
    ;
    legend_group_items
      .append("span")
        .style("padding-left", em*0.5+"px")
        .style("padding-right", em+"px")
        .text(function(d,i){
          return $.SHORTEN_GROUP[d[0]];        
        })
    ;

    // LEGEND GENDER
    var legend_gender_container = d3.select("div#legend-container")
      .append("div")
        .attr("id", "legend-gender")
        .attr("class", "legend")
        .style("display", "none")
        .style("font-size", em+"px")
    ;
    /*
    legend_gender_container.append("h4")
        .text("Diputada o Diputado")
        .style("display", "inline")
        .style("margin-right", em*2+"px")
        .style("font-size", em*1.4+"px")
        .style("font-weight", "400")
    ;
    */
    var legend_gender_items = legend_gender_container.selectAll("div")
        .data(_.pairs(_.omit($.COLOR_GENDER,"Tod@s")))
      .enter()
      .append("div")
      .style("display", "inline")
    ;
    legend_gender_items
      .append("svg")
        .attr("width", em*1.1+"px")
        .attr("height", em*1.1+"px")
      .append("circle")
        .attr({
          "r" : em/2,
          "cx" : em/2,
          "cy" : em/2,
        })
        .style("stroke", "grey")
        .style("fill", function(d,i){
          return d[1];
        })
    ;
    legend_gender_items
      .append("span")
        .style("padding-left", em*0.5+"px")
        .style("padding-right", em+"px")
        .text(function(d,i){
          return $.EXTEND_GENDER[d[0]];        
        })
    ;

    // Select Legend
    selectLegend($.selected_view);

  };

  function drawRanking(){
    console.log("drawRanking");

    // Delete obsolete ranking 1st
    d3.selectAll("div.inner-ranking-item").remove();

    var ranking_items = d3.selectAll("div.ranking-item")
      .append("div")
        .attr("class", "inner-ranking-item")
        // Hide if not selected and not fixed
        .style("display", function(d,i){
          var r = $.data_selected_names[d.name] || $.data_fixed_names[d.name];
          return r ? "block" : "none";
        })     
        .style("cursor", "pointer")
        .on("mouseover", function(d,i){
          selectSeat(d.name, this);
          // Simple way of shadowing background 
          d3.select(this)
            .style("background-color", "#f3f3f3")
          ;
        })
        .on("mouseout", function(d,i){
          // Simple way of shadowing background 
          d3.select(this)
            .style("background-color", "white")
          ;
        })
        .on("click", function(d,i){
          selectSeat(d.name, this);
        })
    ;
    // Custom sort: fixed members first
    /*
    ranking_items.sort(function comparator(a,b){
        // Force fixed elements to be 1st in the sorted list
        var a_salary = a.salary_year; 
        var b_salary = b.salary_year; 
        var a_multiplier = $.data_fixed_names[a.name] ? 1000 : 1;
        var b_multiplier = $.data_fixed_names[b.name] ? 1000 : 1;
        var r = b_multiplier * b.salary_year - a_multiplier * a.salary_year;
        return r;
    });
    */
    ranking_items.sort(function comparator(a,b){
        // Force fixed elements to be 1st in the sorted list
        var a_rank = a.rank; 
        var b_rank = b.rank; 
        var a_multiplier = $.data_fixed_names[a.name] ? 0.001 : 1;
        var b_multiplier = $.data_fixed_names[b.name] ? 0.001 : 1;
        var r =  - b_multiplier * b_rank + a_multiplier * a_rank;
        return r;
    });
    
    var f = $.LOCALE.numberFormat(",.0f");

    //var h = "4.1em";
    //var h2 = "2em";
    var h = $.W_chamber/16;
    var h2 = h/2;

    // Container style for items
    ranking_items
        .style({
          "border-bottom" : "1px solid silver",
          "height" : h,
          "clear" : "both",
        })
        .style("background-color", function(d,i){
          return "white"; // TODO: coloring background if selected is expensive
          var r = $.selected_seat === d.name ? 
            "#f3f3f3" : "white"
          ;
          return r;
        })
    ;
    // Rank (float left) with pushpin
    ranking_items
      .append("div")
        .classed("pull-left", true)
        .style({
          "font-size" :h2*1.0+"px",
          "color" : "grey",
          "padding-right" : "0.2em",
          "padding-left" : "0.2em",
          "margin-right": "0.2em",
          "height" : h2*1.0+"px"
        })
        /*
        .style("border-left", function(d,i){
          return h2/8+"px solid "+$.COLOR_GROUP[d.group];
        })
        */
        .text(function(d,i){
          return d.rank;
        })
    ;
    // Flag with group's color
    ranking_items
      .append("div")
        .classed("pull-left", true)
        .style("font-size", h2/1.6+"px")
        .style("color", function(d,i){
          return $.COLOR_GROUP[d.group];
        })
        .html(function(d,i){
          var r = '<span class="glyphicon glyphicon-flag" aria-hidden="true"></span>'
          return r;
        })
    ;
    // Photo
    ranking_items
      .append("img")
        .classed("pull-right", true)
        .classed("img-rounded", true)
        .style("height", h2*1.6+"px")
        .attr("src", function(d,i){
          return d.foto_src;
        })
    ;
    // Pushpin
    var pins = ranking_items
      .append("span")
        .classed({
          "glyphicon" : true,
          "glyphicon-pushpin" : true,
          "pull-left" : true
        })
        .style("color", function(d,i){
          return $.data_fixed_names[d.name] ? 
            $.COLOR_GROUP[d.group] : "silver";
        })
        .style("font-size", h2/1.0+"px")
        .style("padding-right", "0.2em")
        .style("padding-left", "0.2em")
    ;
    pins.on("click", function(d,i){
      // Toggle this name as fixed and redraw ranking
      d3.event.stopPropagation(); //Prevents click bubbling to container
      $.data_fixed_names[d.name] = ! $.data_fixed_names[d.name];
      drawRanking();
    });
    // Salary 
    ranking_items
      .append("span")
        .classed("pull-right", true)
        .style("font-size", h2/1.3+"px")
        .html(function(d,i){
          var rank = i+1;
          var formatted_salary = f(d.salary_year);
          return formatted_salary+ " &euro;/año";
        })
    ;
    // Name 
    ranking_items
      .append("span")
        .style("color", function(d,i){
          return "black";
        })
        .style("font-size", h2/1.4+"px")
        .style("padding-left", "0.5em")
        .html(function(d,i){
          return d.name+"<br>";
        })
    ;
    

    var h3 = h*0.12;
    // Ranking visual bar
    var visual_bars = ranking_items
      .append("div")
      .append("svg")
        .attr("width", "100%")
        .attr("height", 2.1*h3+"px")
    ;
    // Nested Join to attach number of coints to each visual bar
    var coins = visual_bars
      .selectAll("g")
        .data(function(d,i){
          var ranking_width = $.ranking.node().clientWidth;
          var n_coins = parseInt(d.salary_year/350000*ranking_width/h3);
          var r =  _.map(_.range(n_coins), function(i){
            return {
              i : i,
              n_coins : n_coins,  
              salary_year : d.salary_year,
              salary_partial : d.salary_year/n_coins * i
            }
          });
          return r;
        })
      .enter()
        .append("g")
        .attr("class","coin")
        .attr("transform", function(d,i){
          var x = h3 + h3*d.i*1.4;
          return "translate("+ x +","+ 0 +")";
        })
    ;
    coins
      .append("circle")
        //.attr("stroke", "black")
        /*
        .attr("cx",function(d,i){
          return h3 + h3*d.i*1.4;
        })
        */
        .attr("cy",h3)
        .attr("r",h3)
        .style("fill", function(d,i){
          return $.color_gradient(d.salary_partial);
        })
        .style("stroke", function(d,i){
          return "grey";
        })
    ;
    /*
    coins
      .append("text")
        .style("font-size", 2*h3+"px")
        .style("fill", "white")
        .attr("x", -h3/2)
        .attr("y", 1.7*h3)
        .html("&euro;")
    ;
    */
      

  };
    
  function selectLegend(view_id){
    d3.selectAll(".legend")
        .style("display", "none")
    ;
    d3.select($.LEGEND_ID[view_id])
        .style("display", "block")
    ;
    
    
  };

  // Radio selection
  function selectView(i){
    // Radio buttons selection
    // @i --> index corresponding to chosen option (0,1,2,...)
    $.selected_view = i;
    drawAll();
    selectLegend(i);
  };
  
  // Nav selection
  function selectNav(id){
    // Selection from nav bar
    // @id --> nav li id --> matches class of elements to show

    // (1) Highlight selected nav tab
    d3.selectAll("ul#navigation-tabs li")
        .classed("active", false)
    ;
    d3.select("ul#navigation-tabs li#"+id)
        .classed("active", true)
    ;
    // (2) Hide unselected panels
    d3.selectAll(".nav-target")
        .style("display", "none")
    ;
    // (3) Show selected panels
    d3.selectAll("."+id)
        .style("display", "block")
    ;
  };

  // Filter ranking
  function filterRanking(query){

    var all_the_names = $.data_names;
        
    var regex = new RegExp(query, "i");
    function checkField(field){
      return field.match(regex) ? true : false;
    };
    function isSelected(member_name){
      // Checks if single member is included in selection
      if (!member_name || ! $.data_merged[member_name]) return false; 

      var member = $.data_merged[member_name];
      var r = 
        checkField(member.name) ||
        checkField(member.group && $.SHORTEN_GROUP[member.group]) ||
        checkField(member.group) ||
        checkField(member.province) ||
        checkField(member.seat_code)
      ;
      return r;
    };

    // Updates filtered list of names
    _.each($.data_merged, function(v,k){
      $.data_selected_names[k] = isSelected(k);
    });
    
    // Now drawRanking! (update only with selected)
    drawRanking();
  };

  // Draw Averags
  function drawAverages(){
    console.log("drawAverages");

    // Clean all bars (just in case, for resize...)
    d3.select("#averages").selectAll(".bar div").remove();
    
    // Formatter (for salaries)
    var f = $.LOCALE.numberFormat(",.0f");

    //
    // TOTAL in SALARIES
    //
    $.total_diagram
        .classed("bar", true)
      .append("div")
        .html(f($.data_total) + " &euro; / año") 
        .style("font-size", "1.5em")
        .style("font-weight", "600")
    ;
    $.total_diagram
        .classed("bar", true)
      .append("div")
        .html("Sueldo Mediano: "+f($.data_median) + " &euro; / año") 
        .style("font-size", "1em")
    ;
    $.total_diagram
        .classed("bar", true)
      .append("div")
        .html("Sueldo Medio: "+f($.data_average) + " &euro; / año") 
        .style("font-size", "1em")
    ;
    $.total_diagram
        .classed("bar", true)
      .append("div")
        .html("Sueldo Máximo: "+f($.data_max) + " &euro; / año") 
        .style("font-size", "1em")
    ;
    $.total_diagram
        .classed("bar", true)
      .append("div")
        .html("Sueldo Mínimo: "+f($.data_min) + " &euro; / año") 
        .style("font-size", "1em")
    ;

    //
    // GENDER averages
    //
    var gender_bars = $.average_gender_diagram.selectAll("div.bar")
        .style("height", "2.5em")
        /*
        .style("width", function(d,i){
          // Calculate max every time is not optimal
          var max = _.max($.data_average_by_gender, function(d,i){
            return d[1];
          })[1];
          var r = parseInt(d[1]/max * 100);
          return r+"%";
        })
        .style("background-color", function(d,i){
          return $.COLOR_GENDER[d[0]];
        })
        */
        .style("margin-bottom", "0.2em")
    ;
    gender_bars.sort(function comparator(a,b){
      return b[1]-a[1];
    });
    // Add label
    gender_bars
      .append("div")
        .text(function(d,i){
          return $.EXTEND_GENDER[d[0]];
        })
         .style("padding-left", "0.2em") 
         .classed("pull-left", true)
    ;
    // Add salary
    gender_bars
      .append("div")
        .html(function(d,i){
          return f(parseInt(d[1]))+" &euro;/año";
        })
         .style("padding-right", "0.2em") 
         .classed("pull-right", true)
    ;
    // Add Color Inner Bar
    gender_bars
      .append("div")
      .style("clear", "both")
      .style("height", "0.6em")
      .style("width", function(d,i){
        // Calculate max every time is not optimal
        var max = _.max(_.union($.data_average_by_group, $.data_average_by_gender), function(d,i){
          return d[1];
        })[1];
        var r = parseInt(d[1]/max * 100);
        return r+"%";
      })
      .style("background-color", function(d,i){
        return $.COLOR_GENDER[d[0]];
      })
    ;

    //
    // GROUP averages
    //
    var group_bars = $.average_group_diagram.selectAll("div.bar")
        .style("height", "2.5em")
        .style("margin-bottom", "4px")
        .style("color", "black")
        .style("font-weight", "400")
    ;
    group_bars.sort(function comparator(a,b){
      return b[1]-a[1];
    });
    // Add label
    group_bars
      .append("div")
        .text(function(d,i){
          return $.SHORTEN_GROUP[d[0]];
        })
        .style("padding-left", "0.2em") 
        .classed("pull-left", true)
    ;
    // Add salary
    group_bars
      .append("div")
        .html(function(d,i){
          return f(parseInt(d[1]))+" &euro;/año";
        })
        .style("padding-left", "0.2em") 
        .classed("pull-right", true)
    ;
    // Add Color Inner Bar
    group_bars
      .append("div")
      .style("clear", "both")
      .style("height", "0.6em")
      .style("width", function(d,i){
        // Calculate max every time is not optimal
        var max = _.max(_.union($.data_average_by_group, $.data_average_by_gender), function(d,i){
          return d[1];
        })[1];
        var r = parseInt(d[1]/max * 100);
        return r+"%";
      })
      .style("background-color", function(d,i){
        return $.COLOR_GROUP[d[0]];
      })
    ;
  };

  //
  // Lock/Unlock seat
  //
  function lockSeat(){
    $.selected_seat_locked = true;
    drawAll();
  };
  function unLockSeat(){
    $.selected_seat_locked = false;
    drawAll();
  };

  //  
  // EXPORTABLE stuff
  //
  function main(){
    console.log("MAIN");
    init();
  };

  //
  // EXPORT module
  //
  return {
    main : main,
    $ : $ // TODO: delete this, is for debugging purposes 
  };
  

}($, _, d3))



