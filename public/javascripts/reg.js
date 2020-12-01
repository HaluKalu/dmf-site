$('.form-control').each(function () {
	$(this).on('blur', function () {
		if ($(this).val().trim() != "") {
			$(this).addClass('val-has');
		} else {
			$(this).removeClass('val-has');
		}
	});
});
var shw = 0;
$('.btn-show-pass').on('click', function () {
	if (shw == 0) {
		$(this).next('input').attr('type', 'text');
		$(this).find('i').addClass('fa-eye-slash');
		$(this).find('i').removeClass('fa-eye');
		shw = 1
	} else {
		$(this).next('input').attr('type', 'password');
		$(this).find('i').addClass('fa-eye');
		$(this).find('i').removeClass('fa-eye-slash');
		shw = 0;
	}
});
function onupdName(e) {
	let selector = e.path[0];
	let curValue = e.path[0].value;
	let curType = e.path[0].type;
	if (curType === 'text') {
		let reg = new RegExp('[А-Яа-яA-Za-z]+');
		let res = curValue.match(reg);
		if (res === null || res[0].length < curValue.length) {
			alert('Введите корректное значение всех поля. Допустимы только буквы русского и английского алфавита.');
			selector.value = "";
		}
	}
}

function onupdGroup(e) {
	let selector = e.path[0];
	let curValue = e.path[0].value;
	let curType = e.path[0].type;
	if (curType === 'text') {
		let reg = new RegExp('[А-Яа-яA-Za-z0-9\-]+');
		let res = curValue.match(reg);
		if (res === null || res[0].length < curValue.length) {
			alert('Введите корректное значение всех поля. Допустимы только буквы русского и английского алфавита.');
			selector.value = ""
		}
	}
}

function onupdLogin(e) {
	let selector = e.path[0];
	let curValue = e.path[0].value;
	let curType = e.path[0].type;
	if (curType === 'text') {
		let reg = new RegExp('[А-Яа-яA-Za-z0-9+_\\-:@]+');
		let res = curValue.match(reg);
		if (res === null || res[0].length < curValue.length) {
			alert('Введите корректное значение всех поля. Допустимы только буквы русского и английского алфавита.');
			selector.value = ""
		}
	}
}
document.getElementById('fam').onchange = (e) => {
	onupdName(e)
};
document.getElementById('name').onchange = (e) => {
	onupdName(e)
};
document.getElementById('group').onchange = (e) => {
	onupdGroup(e)
};
document.getElementById('login').onchange = (e) => {
	onupdLogin(e)
};