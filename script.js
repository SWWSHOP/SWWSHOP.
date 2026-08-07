let products = {
    liquids: [
        {
            name: "ALFA VAPE 50MG",
            price: 350,
            flavors: [
                { name: "Черничный лимонад", available: false },
                { name: "Персик манго", available: true },
                // Остальные вкусы...
            ]
        },
        // Остальные жидкости...
    ],
    // Остальные категории...
};

function showCategory(category) {
    // Логика отображения категории
}

function showProduct(product) {
    // Логика отображения продукта
}

// Админ панель
const ADMIN_PASSWORD = "SWWADMIN_SWQ35YTF";

function checkAdmin() {
    const password = prompt("Введите пароль администратора");
    if (password === ADMIN_PASSWORD) {
        document.getElementById('admin-link').style.display = 'block';
    }
}
