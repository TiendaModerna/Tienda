// إنشاء متغير عالمي للسلة
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// Function to refresh cart quantities from Firebase
function refreshCartQuantities() {
    cart.forEach(item => {
        db.ref(`Producto/${item.id}`).once('value', (snapshot) => {
            const product = snapshot.val();
            if (product && product.cantidad) {
                // Update the quantity in the cart
                item.quantity = product.cantidad;
                
                // Find the cart item element to update the UI
                const itemDiv = document.querySelector(`[data-id="${item.id}"]`);
                if (itemDiv) {
                    const input = itemDiv.querySelector('.quantity-input');
                    if (input) {
                        input.value = item.quantity;
                        
                        // Update the item total
                        const itemTotal = Number(item.pventa) * Number(item.quantity);
                        const itemTotalElement = itemDiv.querySelector('.item-total');
                        if (itemTotalElement) {
                            itemTotalElement.textContent = itemTotal.toFixed(2);
                        }
                    }
                }
                
                // Update the total
                updateTotal();
                
                // Save the changes
                saveCart();
            }
        });
    });
}

function updateCartUI() {
    const cartContainer = document.getElementById('cart-container');
    if (!cartContainer) return;

    cartContainer.innerHTML = '';
    
    if (cart.length === 0) {
        cartContainer.innerHTML = '<p>السلة فارغة</p>';
        return;
    }

    cart.forEach(item => {
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <img src="${item.url}" alt="${item.descrepcion}">
            <h3>${item.descrepcion}</h3>
            <p>الكمية: ${item.quantity}</p>
            <p>السعر: ${item.pventa * item.quantity} درهم</p>
        `;
        cartContainer.appendChild(div);
    });

    updateTotal();
}

function handleQuantityChange(e) {
    const target = e.target;
    const itemDiv = target.closest('.cart-item');
    const input = itemDiv.querySelector('.quantity-input');
    const productId = parseInt(itemDiv.dataset.id);
    const item = cart.find(item => item.id === productId);

    if (!item || !itemDiv || !input) return;

    const action = target.dataset.action;
    let newQuantity = Number(item.quantity) || 1;

    if (action === 'increase') {
        newQuantity = Math.min(newQuantity + 1, 999);
    } else if (action === 'decrease') {
        newQuantity = Math.max(newQuantity - 1, 1);
    } else {
        newQuantity = Math.max(parseInt(input.value) || 1, 1);
    }

    // Update the quantity in the cart
    item.quantity = newQuantity;
    input.value = newQuantity;

    // Update the item total
    const itemTotal = Number(item.pventa) * newQuantity;
    const itemTotalElement = itemDiv.querySelector('.item-total');
    if (itemTotalElement) {
        itemTotalElement.textContent = itemTotal.toFixed(2);
    }

    // Update the total
    updateTotal();

    // Save changes to localStorage
    saveCart();

    // Update the cart UI
    updateCartUI();

    // Notify user
    speak(`تم تغيير كمية ${item.descrepcion || 'المنتج'} إلى ${newQuantity} وحدة`);
}

function updateTotal() {
    try {
        let total = cart.reduce((acc, item) => {
            const price = Number(item.pventa) || 0;
            const quantity = Number(item.quantity) || 1;
            return acc + (price * quantity);
        }, 0);
        
        const totalElement = document.getElementById('cart-total');
        if (totalElement) {
            totalElement.textContent = total.toFixed(2);
        }

        // Update cart badge
        const cartBadge = document.getElementById('cart-badge');
        if (cartBadge) {
            let totalQuantity = cart.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0);
            cartBadge.textContent = totalQuantity;
        }
        
    } catch (error) {
        console.error('خطأ في تحديث المجموع:', error);
        alert('حدث خطأ أثناء تحديث المجموع');
    }
}

function saveCart() {
    try {
        localStorage.setItem('cart', JSON.stringify(cart));
        console.log('Cart saved successfully');
    } catch (error) {
        console.error('Error saving cart:', error);
    }
}

// Add product to cart
function addToCart(productId, price, description, imageUrl) {
    const button = event.target;
    
    // Get the product data from Firebase
    db.ref(`Producto/${productId}`).once('value', (snapshot) => {
        const product = snapshot.val();
        if (!product || !product.id) {
            console.error('Product not found:', productId);
            alert('المنتج غير موجود');
            return;
        }

        // Check if product already exists in cart
        const existingItem = cart.find(item => item.id === productId);
        
        if (existingItem) {
            // If product exists, increment quantity by 1
            existingItem.quantity = (existingItem.quantity || 1) + 1;
        } else {
            // If product doesn't exist, add it with quantity 1
            const newProduct = {
                id: productId,
                nombre: product.nombre || description || 'منتج غير معروف',
                descrepcion: description || 'منتج غير معروف',
                pventa: Number(price) || 0,
                cantidad: Number(product.cantidad) || 1,
                codebar: product.codebar || '',
                url: imageUrl || '',
                talla: product.talla || '',
                color: product.color || '',
                marca: product.marca || '',
                local: product.local || '',
                proveedor: product.proveedor || '',
                pcompra: Number(product.pcompra) || 0,
                quantity: 1
            };
            
            // Validate required fields
            if (!newProduct.descrepcion || isNaN(newProduct.pventa)) {
                console.error('Invalid product data:', newProduct);
                alert('خطأ: بيانات المنتج غير صالحة');
                return;
            }
            
            cart.push(newProduct);
        }

        // Update the button state
        if (button) {
            button.classList.add('added');
            setTimeout(() => {
                button.classList.remove('added');
            }, 1000);
        }

        // Log cart state
        console.log('Adding product:', {
            id: productId,
            price: price,
            description: description,
            imageUrl: imageUrl
        });
        console.log('Cart state before addition:', cart);

        // Update the UI
        updateCartUI();
        
        // Save changes to localStorage
        saveCart();
        
        // Log cart state after addition
        console.log('Cart state after addition:', cart);
        
        // Notify user
        speak(`تم إضافة ${description || 'منتج جديد'} إلى السلة`);
    }).catch(error => {
        console.error('Error fetching product data:', error);
        alert('حدث خطأ أثناء إضافة المنتج');
    });
}

// Decrease product quantity
function decreaseQuantity(productId, price, description, imageUrl) {
    const button = event.target;
    
    // Get the product data from Firebase
    db.ref(`Producto/${productId}`).once('value', (snapshot) => {
        const product = snapshot.val();
        if (!product || !product.id) {
            console.error('Product not found:', productId);
            alert('المنتج غير موجود');
            return;
        }

        // Check if product exists in cart
        const cartItem = cart.find(item => item.id === productId);
        
        if (cartItem) {
            // If product exists in cart, decrease quantity by 1
            if (cartItem.quantity > 1) {
                cartItem.quantity -= 1;
            } else {
                // If quantity is 1, remove the product from cart
                cart = cart.filter(item => item.id !== productId);
            }
        }

        // Update the button state
        if (button) {
            button.classList.add('added');
            setTimeout(() => {
                button.classList.remove('added');
            }, 1000);
        }

        // Log cart state
        console.log('Decreasing product:', {
            id: productId,
            price: price,
            description: description,
            imageUrl: imageUrl
        });
        console.log('Cart state before decrease:', cart);

        // Update the UI
        updateCartUI();
        
        // Save changes to localStorage
        saveCart();
        
        // Log cart state after decrease
        console.log('Cart state after decrease:', cart);
        
        // Notify user
        speak(`تم تقليل كمية ${description || 'منتج'} في السلة`);
    }).catch(error => {
        console.error('Error fetching product data:', error);
        alert('حدث خطأ أثناء تقليل كمية المنتج');
    });
}

// Share cart on WhatsApp
function shareOnWhatsApp() {
    if (cart.length === 0) {
        alert('السلة فارغة!');
        return;
    }

    // Create WhatsApp message
    let message = 'طلب جديد من المتجر:\n\n';
    
    cart.forEach(item => {
        const quantity = item.quantity || 1;
        message += `• ${item.descrepcion}\n`;
        message += `  - الباركود: ${item.codebar}\n`;
        message += `  - الكمية: ${quantity}\n`;
        message += `  - السعر: ${item.pventa} درهم\n`;
        message += `  - المجموع: ${(item.pventa * quantity).toFixed(2)} درهم\n\n`;
    });

    // Add total
    const total = cart.reduce((acc, item) => {
        const quantity = item.quantity || 1;
        return acc + (Number(item.pventa) * quantity);
    }, 0);
    message += `المجموع الكلي: ${total.toFixed(2)} درهم\n`;

    // Create WhatsApp link with correct number
    const whatsappUrl = `https://wa.me/212612345678?text=${encodeURIComponent(message)}`; // Use a correct Moroccan number

    // Open the link in a new window
    window.open(whatsappUrl, '_blank');
}

// Load WhatsApp number on page load
window.addEventListener('load', () => {
    // Update cart UI
    updateCartUI();
    
    // Add share button
    const shareBtn = document.createElement('button');
    shareBtn.className = 'share-cart-btn';
    shareBtn.textContent = 'مشاركة على WhatsApp';
    shareBtn.onclick = shareOnWhatsApp;

    // Add button to UI
    const cartContainer = document.querySelector('.cart-modal'); // Use class instead of ID
    if (cartContainer) {
        cartContainer.appendChild(shareBtn);
    }
});

// Add speech support
const speech = new SpeechSynthesisUtterance();

function speak(message) {
    // التحقق من دعم ميزة النطق
    if ('speechSynthesis' in window) {
        // إنشاء كائن جديد للنطق في كل مرة
        const utterance = new SpeechSynthesisUtterance();
        
        // تعيين خصائص النطق
        utterance.lang = 'ar-SA';
        utterance.text = message;
        utterance.rate = 1.0; // سرعة النطق (1.0 هي السرعة الافتراضية)
        utterance.pitch = 1.0; // ارتفاع الصوت (1.0 هو المتوسط)
        utterance.volume = 1.0; // مستوى الصوت (1.0 هو الأقصى)
        
        // إيقاف أي نطق قائم
        window.speechSynthesis.cancel();
        
        // التحقق من وجود أصوات متاحة
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            // اختيار أول صوت متاح
            utterance.voice = voices[0];
            
            // التحقق من وجود صوت عربي
            const arabicVoice = voices.find(voice => voice.lang === 'ar-SA');
            if (arabicVoice) {
                utterance.voice = arabicVoice;
            }
        }
        
        // تشغيل النطق
        window.speechSynthesis.speak(utterance);
        
        // إضافة معالج للانتهاء
        utterance.onend = () => {
            console.log('تم الانتهاء من النطق');
        };
        
        // إضافة معالج للخطأ
        utterance.onerror = (event) => {
            console.error('حدث خطأ في النطق:', event);
        };
    } else {
        console.log('متصفحك لا يدعم ميزة النطق');
    }
}
