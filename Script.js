let db;
let products = [];
let invoices = [];
let userRole = ''; // لتخزين دور المستخدم (مدير أو عميل)
const request = indexedDB.open("PharmacyApp", 1);

request.onupgradeneeded = function (event) {
    db = event.target.result;
    if (!db.objectStoreNames.contains("products")) {
        db.createObjectStore("products", { keyPath: "id", autoIncrement: true });
    }
    if (!db.objectStoreNames.contains("invoices")) {
        db.createObjectStore("invoices", { keyPath: "id", autoIncrement: true });
    }
};

request.onsuccess = function (event) {
    db = event.target.result;
    loadProducts();
    loadInvoices();
};

function checkLogin() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    if (username === "admin" && password === "12345") {
        userRole = 'admin'; // تعيين دور المدير
        document.getElementById("loginPage").style.display = "none";
        document.getElementById("dashboardPage").style.display = "block";
        document.getElementById("adminSection").style.display = "block";
    } else if (username === "client" && password === "12345") {
        userRole = 'client'; // تعيين دور العميل
        document.getElementById("loginPage").style.display = "none";
        document.getElementById("dashboardPage").style.display = "block";
        document.getElementById("adminSection").style.display = "none";
    } else {
        alert("اسم المستخدم أو كلمة المرور غير صحيحة");
    }
}

function logout() {
    document.getElementById("dashboardPage").style.display = "none";
    document.getElementById("loginPage").style.display = "flex";
}

function loadProducts() {
    const transaction = db.transaction("products", "readonly");
    const store = transaction.objectStore("products");
    const request = store.getAll();

    request.onsuccess = function () {
        products = request.result;
        updateProductSelect();
        displayProducts();
    };
}

function updateProductSelect() {
    const productSelect = document.getElementById("invoiceProduct");
    productSelect.innerHTML = '<option value="">اختر الصنف</option>';
    products.forEach((product, index) => {
        productSelect.innerHTML += `<option value="${index}">${product.name}</option>`;
    });
}

function loadInvoices() {
    const transaction = db.transaction("invoices", "readonly");
    const store = transaction.objectStore("invoices");
    const request = store.getAll();

    request.onsuccess = function () {
        invoices = request.result;
        displayInvoices();
    };
}

function displayProducts() {
    const table = document.getElementById("productsTable");
    table.innerHTML = `
        <tr>
            <th>اسم الصنف</th>
            <th>نوع الصنف</th>
            <th>رقم الصنف</th>
            <th>تاريخ الإنتاج</th>
            <th>تاريخ الانتهاء</th>
            <th>السعر (ريال)</th>
            <th>حذف</th>
        </tr>
    `;
    products.forEach((product, index) => {
        table.innerHTML += `
            <tr>
                <td>${product.name}</td>
                <td>${product.type}</td>
                <td>${product.code}</td>
                <td>${product.productionDate}</td>
                <td>${product.expiryDate}</td>
                <td>${product.price} ريال</td>
                <td><button class="delete-button" onclick="deleteProduct(${index})">حذف</button></td>
            </tr>
        `;
    });
}

function addProduct() {
    const name = document.getElementById("productName").value;
    const type = document.getElementById("productType").value;
    const code = document.getElementById("productCode").value;
    const productionDate = document.getElementById("productProductionDate").value;
    const expiryDate = document.getElementById("productExpiryDate").value;
    const price = parseFloat(document.getElementById("productPrice").value);

    if (!name || !type || !code || !productionDate || !expiryDate || isNaN(price)) {
        alert("الرجاء إدخال جميع البيانات");
        return;
    }

    const product = { name, type, code, productionDate, expiryDate, price };
    const transaction = db.transaction("products", "readwrite");
    const store = transaction.objectStore("products");
    store.add(product);

    transaction.oncomplete = function () {
        loadProducts();
        resetProductForm();  // إعادة تعيين النموذج بعد إضافة الصنف
    };
}

function resetProductForm() {
    document.getElementById("productName").value = '';
    document.getElementById("productType").value = '';
    document.getElementById("productCode").value = '';
    document.getElementById("productProductionDate").value = '';
    document.getElementById("productExpiryDate").value = '';
    document.getElementById("productPrice").value = '';
}

function deleteProduct(index) {
    if (userRole === 'admin') { // السماح فقط للمدير بحذف الأصناف
        const transaction = db.transaction("products", "readwrite");
        const store = transaction.objectStore("products");
        store.delete(products[index].id);

        transaction.oncomplete = function () {
            loadProducts();
        };
    } else {
        alert("ليس لديك صلاحية لحذف الأصناف");
    }
}

function addInvoice() {
    const productIndex = parseInt(document.getElementById("invoiceProduct").value);
    const quantity = parseInt(document.getElementById("invoiceQuantity").value);

    if (isNaN(productIndex) || productIndex < 0 || productIndex >= products.length || isNaN(quantity)) {
        alert("الرجاء اختيار صنف وإدخال العدد");
        return;
    }

    const product = products[productIndex];
    const total = product.price * quantity;
    const invoice = { product, quantity, total };

    const transaction = db.transaction("invoices", "readwrite");
    const store = transaction.objectStore("invoices");
    store.add(invoice);

    transaction.oncomplete = function () {
        loadInvoices();
        resetInvoiceForm();  // إعادة تعيين النموذج بعد إضافة الفاتورة
    };
}

function resetInvoiceForm() {
    document.getElementById("invoiceProduct").value = '';
    document.getElementById("invoiceQuantity").value = '';
}

function displayInvoices() {
    const table = document.getElementById("invoicesTable");
    table.innerHTML = `
        <tr>
            <th>اسم الصنف</th>
            <th>العدد</th>
            <th>السعر</th>
            <th>الإجمالي</th>
            <th>تحديد</th>
            ${userRole === 'admin' ? '<th>حذف</th>' : ''}
        </tr>
    `;
    invoices.forEach((invoice, index) => {
        table.innerHTML += `
            <tr>
                <td>${invoice.product.name}</td>
                <td>${invoice.quantity}</td>
                <td>${invoice.product.price} ريال</td>
                <td>${invoice.total} ريال</td>
                <td><input type="checkbox" id="checkbox${index}" /></td>
                ${userRole === 'admin' ? `<td><button class="delete-button" onclick="deleteInvoice(${index})">حذف</button></td>` : ''}
            </tr>
        `;
    });
}

function deleteInvoice(index) {
    if (userRole === 'admin') { // السماح فقط للمدير بحذف الفواتير
        const transaction = db.transaction("invoices", "readwrite");
        const store = transaction.objectStore("invoices");
        store.delete(invoices[index].id);

        transaction.oncomplete = function () {
            loadInvoices();
        };
    } else {
        alert("ليس لديك صلاحية لحذف الفواتير");
    }
}

function printInvoices() {
    const selectedInvoices = invoices.filter((invoice, index) => {
        return document.getElementById(`checkbox${index}`).checked;
    });

    if (selectedInvoices.length === 0) {
        alert("الرجاء تحديد الفواتير للطباعة");
        return;
    }

    let invoiceHtml = `
        <h2>برهان السنمي للأدوية</h2>
        <h4>التاريخ والوقت: ${new Date().toLocaleString()}</h4>
        <table border="1" style="width:100%; border-collapse: collapse; color: #003366; direction: rtl;">
            <tr>
                <th>اسم الصنف</th>
                <th>العدد</th>
                <th>السعر</th>
                <th>الإجمالي</th>
            </tr>
    `;

    selectedInvoices.forEach(invoice => {
        invoiceHtml += `
            <tr>
                <td>${invoice.product.name}</td>
                <td>${invoice.quantity}</td>
                <td>${invoice.product.price} ريال</td>
                <td>${invoice.total} ريال</td>
            </tr>
        `;
    });

    invoiceHtml += `
        </table>
        <footer>
            <p class="contact-number">رقم الهاتف: <b style="color: red;">775356423</b></p>
            <p>اسم الدكتور: برهان السنمي</p>
        </footer>
    `;

    const printWindow = window.open('', '', 'height=600, width=800');
    printWindow.document.write(invoiceHtml);
    printWindow.document.close();
    printWindow.print();
}