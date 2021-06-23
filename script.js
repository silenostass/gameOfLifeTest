"use strict";

const CELL_COLOR = "#00cc44";
const FIELD_COLOR = "#e6e6ff";
const FIELD_BORDERS_COLOR = "#b3d9ff";
const CON_COLOR = "#85adad";
const FONT_COLOR = "#00994d";

const CELL_SIZE = 50;
const FIELD_WIDTH = 500;
const FIELD_HEIGHT = 500;
const CON_WIDTH = 500;
const CON_HEIGHT = 75;

class Game {
	constructor() {
		let canvas = document.getElementById("game_field");
		this.canvas = canvas;

		this.gen = 0;
		this.cellCount = 0;

		this.field =  new Field(this.canvas);
		this.timer = null;
	}

	start() {
		this.field.drawField();

		this.canvas.onclick = (event) => {
			this.createGen0Cell(Field.getCords(event));
			HtmlManager.updateNum(this.cellCount, 'cell');
		};

		let main_but_el = document.getElementById("main_but");
		let re_but_el = document.getElementById("re_but");

		main_but_el.onclick = (event) => {
			let updated_el = document.getElementById("main_but");
			let state = updated_el.dataset.state;
			if (state === 'start' || state === 'resume') {
				if (state === 'start') this.canvas.onclick = null;
				this.timer = this.setGenClock();
				if (this.cellCount !== 0) HtmlManager.changeState(updated_el, 'stop');
			} else if (state === 'stop') {
				window.clearInterval(this.timer);
				HtmlManager.changeState(updated_el, 'resume');
			}
		};

		re_but_el.onclick = (event) => {
			this.restart();
		}
	}

	setGenClock() {
		this.nextGen();
		if (this.cellCount == 0) {
			this.gameOver();
			return;
		};
		return window.setInterval( () => {
			  this.nextGen();
			  if (this.cellCount == 0) {
				this.gameOver();
				return;
			};
		}, 3500);
	}

	createGen0Cell(cords) {
		const cell = new Cell(cords);
		this.cellCount += 1;
		this.field.setGen0Cell(cell);
	}

	nextGen() {
		this.gen += 1;
		this.cellCount = this.field.tick();

		HtmlManager.updateNum(this.gen, 'gen');
		HtmlManager.updateNum(this.cellCount, 'cell');
	}

	gameOver() {
		if (this.timer) window.clearInterval(this.timer);
		HtmlManager.infoInButton("Game over!", "#800000");
	}

	restart() {
		if (this.timer) window.clearInterval(this.timer);
		this.cellCount = 0;
		this.gen = 0;

		HtmlManager.updateNum(this.gen, 'gen');
		HtmlManager.updateNum(this.cellCount, 'cell');

		let main_but_el = document.getElementById("main_but");
		HtmlManager.changeState(main_but_el, 'start');

		this.field = new Field(this.canvas);
		this.start();
	}
}

class HtmlManager {
	constructor() {}

	static infoInButton(text, color) {
		let main_but_el = document.getElementById("main_but");

		main_but_el.onclick = null;
		main_but_el.textContent = text;
		main_but_el.style.color = color;
	}

	static updateNum(num, type) {
		let num_el = document.getElementById(`${type}_num`);
		num_el.textContent = num;
	}

	static changeState(el, state) {
		el.setAttribute("data-state", state);
		el.style.color = FONT_COLOR;
		el.textContent= state.toUpperCase();
	}
}

class Field {

	static getCords(event) {
		const bounds = event.target.getBoundingClientRect();
		const x = Math.floor((event.clientX - bounds.left)/CELL_SIZE);
		const y = Math.floor((event.clientY - bounds.top)/CELL_SIZE);
		return {x: x, y: y};
	}

	constructor(canvas) {
		this.canvas = canvas;
		this.cellsNow = new Map();
		this.cellsNext = new Map();
	}

	tick() {
		let countAlive = 0;
		this.cellsNow = this.cellsNext;
		this.cellsNext = new Map();
		for (let cell of this.cellsNow.values()) {
			if (!cell.alive && cell.count == 3) {
				cell.makeAlive(this.canvas);
				countAlive+=1;
			} else if (cell.alive && (cell.count < 2 || cell.count > 3)) {
				cell.die(this.canvas);
			} else if (cell.alive) {
				countAlive+=1;
			}
		}
		this.recheck();
		
		return countAlive;
	}

	//for init
	setGen0Cell(cell) {
		let count = 0;
		let key = `${cell.x}:${cell.y}`;

		let check = this.cellsNow.get(key);
		if (typeof check !== 'undefined' && check.alive) return;

		for (let i = cell.y-1; i < cell.y+2; i++) {
			let y = i;
			if (i < 0) y = 9;
			if (i > 9) y = 0;
			for (let j = cell.x-1; j < cell.x+2; j++) {
				let x = j;
				if (j < 0) x = 9;
				if (j > 9) x = 0;
				if (key === `${x}:${y}`) continue;
				let otherCell = this.cellsNow.get(`${x}:${y}`);
				if (typeof otherCell === 'undefined') {
					let deadCell = new Cell({x, y});
					deadCell.count = 1;
					this.cellsNow.set(`${x}:${y}`, deadCell);
				} else {
					otherCell.count+=1;
					if (otherCell.alive) count+=1;
				}
			}
		}
		this.cellsNow.set(key, cell);
		let setted = this.cellsNow.get(key);
		setted.count = count;
		setted.makeAlive(this.canvas);

		this.cellsNext = this.cellsNow;
	}

	recheck() {
		for (let cell of this.cellsNow.values()) {

			let key = `${cell.x}:${cell.y}`;
			let toSet = new Cell(null, Object.assign({}, cell));
			toSet.count = 0;
			for (let i = cell.y-1; i < cell.y+2; i++) {
				let y = i;
				if (i < 0) y = 9;
				if (i > 9) y = 0;
				for (let j = cell.x-1; j < cell.x+2; j++) {
					let x = j;
					if (j < 0) x = 9;
					if (j > 9) x = 0;
					if (key === `${x}:${y}`) continue;
					let otherCellNext = this.cellsNext.get(`${x}:${y}`);
					let otherCellNow = this.cellsNow.get(`${x}:${y}`);
					//create new dead cell
					if (cell.alive && 
						typeof otherCellNext === 'undefined' &&
						typeof otherCellNow === 'undefined') {
						let newDead = new Cell({x, y})
						newDead.count = 1;
						this.cellsNext.set(`${x}:${y}`, newDead);
						continue;
					}
					if (typeof otherCellNow !== 'undefined' && otherCellNow.alive) {
						toSet.count +=1;
					}
				}	
			}
			if (toSet.alive || toSet.count !== 0) {
				this.cellsNext.set(key, toSet);
			}
		}
	}

	drawField() {
		const ctx = this.canvas.getContext("2d");
		ctx.beginPath();
		ctx.rect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
		ctx.fillStyle = FIELD_COLOR;
		ctx.fill();
		ctx.closePath();

		for (let i = 0; i < FIELD_WIDTH/CELL_SIZE; i++) {
			for (let j = 0; j < FIELD_HEIGHT/CELL_SIZE; j++) {
				ctx.beginPath();
				ctx.rect(CELL_SIZE * i, CELL_SIZE * j, CELL_SIZE, CELL_SIZE);
				ctx.strokeStyle = FIELD_BORDERS_COLOR;
				ctx.stroke();
				ctx.closePath();
			}
		}
	}

}

class Cell {
	constructor(cords, clone=null) {

		if (clone !== null) {
			this.x = clone.x;
			this.y = clone.y;
			this.count = clone.recount;
			this.alive = clone.alive
		} else {
			this.x = cords.x;
			this.y = cords.y;
			this.count = 0;
			this.alive = false;
		}
	}

	makeAlive(canvas) {
		this.alive = true;
		this.drawCell(canvas);
	}

	die(canvas) {
		this.alive = false;
		const ctx = canvas.getContext("2d");

		ctx.beginPath();
		ctx.rect(CELL_SIZE * this.x, CELL_SIZE * this.y, CELL_SIZE, CELL_SIZE);
		ctx.fillStyle = FIELD_COLOR;
		ctx.fill();
		ctx.closePath();

		ctx.beginPath();
		ctx.rect(CELL_SIZE * this.x, CELL_SIZE * this.y, CELL_SIZE, CELL_SIZE);
		ctx.strokeStyle = FIELD_BORDERS_COLOR;
		ctx.stroke();
		ctx.closePath();
	}

	drawCell(canvas) {
		const ctx = canvas.getContext("2d");
		ctx.beginPath();
		ctx.fillStyle = CELL_COLOR;
		ctx.arc(this.x*CELL_SIZE+CELL_SIZE/2, this.y*CELL_SIZE+CELL_SIZE/2, CELL_SIZE/4, 0, Math.PI*2);
		ctx.fill();
		ctx.closePath();
	}
}

document.addEventListener("DOMContentLoaded", function(){
	const game = new Game();
	game.start();

});
