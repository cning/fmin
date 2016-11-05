import {LineGraph} from "./linegraph";
import {Slider} from "./slider";
import {createDropShadowFilter} from "./dropshadow";

export function NelderMead1d(div) {
    this.div = div;
    this.graph = LineGraph();
    this.plot = null;
    this.states =[];
    this.stateIndex = 0;
    this.initial = 0;
    this.cycle = 0;
    this.params  = {'chi' : 1, 'psi' : -1, 'sigma' : 1, 'rho' : 1};

    var obj = this, graph = this.obj, params = this.params;

    div.select(".function_floor").on("click", function() {
        obj.graph.xDomain([25, 75])
            .yDomain([0, 25])
            .f(function(x) { return Math.floor(Math.abs(x-50)); });
        obj.redraw();
        obj.initialize([30]);
        div.select(".function_label").html(d3.select(this).html());
    });

    div.select(".function_smooth").on("click", function() {
        obj.graph.xDomain([-4.9, 6])
            .yDomain([0, 5])
            .f(function(x) { return  Math.log(1 + Math.pow(Math.abs(x), 2+Math.sin(x))); });
        obj.redraw();
        obj.initialize([-4.5]);
        div.select(".function_label").html(d3.select(this).html());
    });

    div.select(".function_noisy").on("click", function() {
        obj.graph.xDomain([-5, 5])
            .yDomain([0, 4])
            .f(function(x) { return (2 + Math.sin(50*x)/50) * Math.atan(x) * Math.atan(x);});
        obj.redraw();
        obj.initialize([-4.5]);
        div.select(".function_label").html(d3.select(this).html());
    });

    $(window).load( function() {
        obj.redraw();
        obj.initialize([-4.5]);

        obj.expansion = Slider(div.select("#expansion"), [1, 5],
                function(x) {
                    div.select("#expansionvalue").text(" = " + x.toFixed(1) + "x");
                    params.chi = x;
                    obj.initialize(obj.initial);
                },
                {'format': function(d) { return d.toFixed(1) + "x"; }, 'initial' : 1.0});

        obj.contraction = Slider(div.select("#contraction"), [0.2, 1],
                function(x) {
                    div.select("#contractionvalue").text(" = " + x.toFixed(2) + "x");
                    obj.params.sigma = x;
                    obj.params.psi = -1 * x;
                    obj.initialize(obj.initial);
                },
                {'format': function(d) { return (d).toFixed(1) + "x"; }, 'initial' : 1.0});
    });
}

NelderMead1d.prototype.redraw = function() {
    this.div.select("svg").data([]).exit().remove();
    this.plot = this.graph(this.div.select("#vis"));
    createDropShadowFilter(this.plot.svg);
    var obj = this;
    this.plot.svg.on("click" , function() {
        var pos = d3.mouse(this);
        obj.initialize([ obj.plot.xScale.invert(pos[0])]);
    });
};

NelderMead1d.prototype.initialize = function(initial) {
    this.initial = initial.slice();
    this.stateIndex = 0;

    var states = this.states = [], graph = this.graph;

    function pushState(x) {
        var state =  [];
        for (var i =0; i < x.length; ++i) {
            state.push({'x': x[i][0], 'y' : graph.f()(x[i]), 'id' : x[i].id });
        }
        state.sort(function(a,b) { return a.id - b.id; });
        states.push(state);
    }

    this.params.callback = pushState;

    fmin.nelderMead(x => this.graph.f()(x[0]), initial, this.params);

    var lines = this.plot.svg.selectAll(".simplex_line").data(this.states[0])
        .enter()
        .append("line")
        .attr("class", "simplex_line")
        .attr("stroke-opacity", 0.7)
        .attr("stroke", "red")
        .attr("stroke-width", 2);

    var circles = this.plot.svg.selectAll(".simplex_circle").data(states[0]);
    circles.enter()
        .append("circle")
        .attr("class", "simplex_circle")
        .style("fill", "red")
        .style("fill-opacity", 0.9)
        .attr("r", 5)
        .attr("cx", d => this.plot.xScale(d.x))
        .attr("cy", d => this.plot.yScale(d.y))
        .attr("filter", "url(#dropshadow)");

    this.cycle += 1;
    this.increment(this.cycle, 1500);
};

NelderMead1d.prototype.increment = function(currentCycle, duration) {
    if (this.cycle != currentCycle) {
        return;
    }
    this.div.select(".iterations").text("Iteration " + (this.stateIndex + 1) + "/" + this.states.length);
    duration = duration || 500;
    var state = this.states[this.stateIndex];
    var lines = this.plot.svg.selectAll(".simplex_line")
       .data(state)
       .transition()
       .duration(this.stateIndex ? duration : 0)
       .attr("x1", d => this.plot.xScale(d.x))
       .attr("y1", d => this.plot.yScale(d.y))
       .attr("x2", (d, i) => this.plot.xScale(state[i ? i - 1 : state.length - 1].x))
       .attr("y2", (d, i) => this.plot.yScale(state[i ? i - 1 : state.length - 1].y));

    var circles = this.plot.svg.selectAll(".simplex_circle")
        .data(state)
        .transition()
        .duration(this.stateIndex ? duration : 0)
        .attr("cx", d => this.plot.xScale(d.x))
        .attr("cy", d => this.plot.yScale(d.y));

    this.stateIndex += 1;
    if (this.stateIndex >= this.states.length) {
        this.stateIndex = 0;
        duration = 5000;
    }
    this.plot.svg.transition()
        .duration(duration)
        .on("end", () => this.increment(currentCycle));
};
